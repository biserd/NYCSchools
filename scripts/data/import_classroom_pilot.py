"""Validate NYCPS releases and generate seed SQL. Does not connect to any database."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

from openpyxl import load_workbook

BASE = "https://infohub.nyced.org/docs/default-source/default-document-library/"
B = "fy27---table-b---enrollment-projections"
C = "fy27---table-c---2026-27-class-size-compliance-by-school"
SPEC = (
    ("november-2025-26", "2025-26", "2025-10-31", "November 2025", 1, "preliminary"),
    ("february-2025-26", "2025-26", "2025-10-31", "February 2026", 2, "revised"),
    ("november-2026-27", "2026-27", "2026-10-31", "November 2026", 1, "preliminary"),
)
PROGRAMS = ("Gen Ed", "ICT")
DBN = re.compile(r"[0-9]{2}[A-Z][0-9]{3}")
GRADES = ["3K", "PreK", "K", *map(str, range(1, 13)), "Total", "Total K-12"]


def source_url(name):
    return BASE + name + ".xlsx"


def download(name, cache):
    path = cache / (name + ".xlsx") if cache else None
    if path and path.is_file():
        raw = path.read_bytes()
    else:
        with urlopen(Request(source_url(name), headers={"User-Agent": "Mozilla/5.0"}), timeout=45) as response:
            raw = response.read()
        if path:
            path.write_bytes(raw)
    book = load_workbook(BytesIO(raw), read_only=True, data_only=True)
    return book, {"url": source_url(name), "sha256": sha256(raw).hexdigest()}


def expect(ok, message):
    if not ok:
        raise ValueError(message)


def read_value(raw):
    if isinstance(raw, int) and not isinstance(raw, bool) and raw >= 0:
        return raw, "reported"
    if raw is None or str(raw).strip() in {"", "N/A", "—", "-"}:
        return None, "missing"
    if str(raw).strip() in {"s", "S", "*", "**", "<5", "Suppressed"}:
        return None, "suppressed"
    raise ValueError(f"Unexpected enrollment value: {raw!r}")


def get_register(book, tab, year):
    rows = iter(book[tab].values)
    for row in rows:
        if row[:3] == ("DBN", "School Name", "School Year"):
            expect(list(map(str, row[3:20])) == GRADES, f"Register header changed: {tab}")
            break
    else:
        raise ValueError(f"No register headers: {tab}")
    records = {}
    for row in rows:
        dbn = str(row[0]).strip()
        if not DBN.fullmatch(dbn):
            continue
        expect(dbn not in records and row[2] == year, f"Unexpected/duplicate register row: {tab} {dbn}")
        records[dbn] = dict(zip(GRADES, map(read_value, row[3:20])))
        grades = [records[dbn][grade][0] for grade in ["K", *map(str, range(1, 13))]]
        total = records[dbn]["Total K-12"][0]
        if total is not None and all(x is not None for x in grades):
            expect(sum(grades) == total, f"K–12 grade rollup mismatch: {tab} {dbn}")
    return records


def register_summary(before, after):
    def has_total(data, dbn):
        return data[dbn]["Total K-12"][0] is not None

    matched = {dbn for dbn in before.keys() & after.keys() if has_total(before, dbn) and has_total(after, dbn)}
    def total(records, keys):
        return sum(records[dbn]["Total K-12"][0] for dbn in keys if has_total(records, dbn))

    return {
        "beforeSchools": len(before), "afterSchools": len(after), "matchedSchools": len(matched),
        "addedSchools": len(after.keys() - before.keys()), "removedSchools": len(before.keys() - after.keys()),
        "beforeTotal": total(before, before), "afterTotal": total(after, after),
        "matchedBefore": total(before, matched), "matchedAfter": total(after, matched),
    }


def class_rows(book, district=False):
    rows = iter(book["K-5 Average"].values)
    header = list(next(rows))
    key_col = header.index("District" if district else "DBN")
    grade_col = header.index("Grade Level")
    program_col = header.index("Program Type")
    students_col = header.index("Number of Students")
    classes_col = header.index("Number of Classes")
    subject_col = header.index("Subject") if "Subject" in header else None
    name_col = None if district else header.index("School Name")
    result = {}
    for row in rows:
        key = str(row[key_col]).strip()
        in_district = key.zfill(2) == "02" if district else key.startswith("02") and DBN.fullmatch(key)
        if not in_district or row[grade_col] not in ("K", "0K"):
            continue
        program = row[program_col]
        if program not in PROGRAMS or (subject_col is not None and row[subject_col] != "Official Class"):
            continue
        students, classes = row[students_col], row[classes_col]
        expect((key, program) not in result, f"Duplicate class-size row: {key} {program}")
        expect(isinstance(students, int) and isinstance(classes, int) and 0 < classes <= students, f"Invalid class counts: {key} {program}")
        result[key, program] = (row[name_col] if name_col is not None else "District 2", students, classes)
    return result


def district_check(schools, district):
    officials = {program: (students, classes) for (_, program), (_, students, classes) in district.items()}
    expect(set(officials) == set(PROGRAMS) and len(district) == len(PROGRAMS), "Missing or repeated official program total")
    for program in PROGRAMS:
        totals = tuple(sum(row[i] for (_, p), row in schools.items() if p == program) for i in (1, 2))
        expect(officials[program] == totals, f"District class-size workbook does not reconcile for {program}: {officials[program]} vs {totals}")
    return officials


def pilot_class_sizes(book, averages, dbn="02M158"):
    rows = iter(book["K-5 Counts"].values)
    header = list(next(rows))
    col = {key: header.index(key) for key in ("DBN", "Grade Level", "Program Type", "Subject", "Class Size", "Number of Students", "Number of Classes")}
    bins = {}
    for row in rows:
        program = row[col["Program Type"]]
        if row[col["DBN"]] != dbn or row[col["Grade Level"]] != "K" or program not in PROGRAMS or row[col["Subject"]] != "Official Class":
            continue
        label, students, classes = (row[col[k]] for k in ("Class Size", "Number of Students", "Number of Classes"))
        size = int(str(label)) if str(label).isdigit() else None
        expect((program, label) not in bins and isinstance(students, int) and isinstance(classes, int) and classes > 0,
               f"Duplicate or invalid published size bucket: {dbn} {program} {label}")
        expect(size is None or size * classes == students, "Exact size bucket does not reconcile")
        bins[program, label] = {"program": program, "size": size, "label": str(label), "students": students, "classes": classes}
    for program in PROGRAMS:
        selected = [row for row in bins.values() if row["program"] == program]
        expect(tuple(sum(row[key] for row in selected) for key in ("students", "classes")) == averages[dbn, program][1:],
               f"Published size buckets do not reconcile to average for {dbn} {program}")
    return sorted(bins.values(), key=lambda row: (row["size"] is not None, row["size"] or 0, row["program"]))


def cap_rows(book):
    rows = iter(book["26-27 K-5 by DBN & Grade"].values)
    header = [str(x or "").lower() for x in next(rows)]
    # Fixed columns verified with the official tab and guarded against drift.
    expect("dbn" in header[0] and "grade" in header[2] and "class" in header[4] and "at or below" in header[5], f"Cap size headers changed: {header}")
    results = {}
    for row in rows:
        dbn = str(row[0]).strip()
        if not dbn.startswith("02") or not DBN.fullmatch(dbn) or row[2] not in ("K", "0K") or row[3] != "Official Class":
            continue
        eligible, meets = row[4:6]
        expect(dbn not in results and isinstance(eligible, int) and isinstance(meets, int) and 0 <= meets <= eligible and eligible > 0,
               f"Invalid/duplicate class cap row: {dbn}")
        results[dbn] = (eligible, meets)
    return results


def matched_analysis(before_register, after_register, before_classes, after_classes):
    def by_school(rows):
        schools = defaultdict(dict)
        for (dbn, program), record in rows.items():
            schools[dbn][program] = record[1:]
        return schools

    previous, current = by_school(before_classes), by_school(after_classes)
    changes = Counter()
    matrix = {row: {col: 0 for col in ("smaller", "unchanged", "larger")} for row in ("falling", "flat", "rising")}
    examples = {}
    points = []
    for dbn in sorted(previous.keys() & current.keys() & before_register.keys() & after_register.keys()):
        if previous[dbn].keys() != current[dbn].keys():
            continue
        then = before_register[dbn]["K"][0]
        now = after_register[dbn]["K"][0]
        if then is None or now is None:
            continue
        changes["schools"] += 1
        old_n, old_c = map(sum, zip(*previous[dbn].values()))
        new_n, new_c = map(sum, zip(*current[dbn].values()))
        delta = new_n * old_c - old_n * new_c
        enrollment_direction = "falling" if now < then else "rising" if now > then else "flat"
        size_direction = "smaller" if delta < 0 else "larger" if delta > 0 else "unchanged"
        matrix[enrollment_direction][size_direction] += 1
        record = {
            "dbn": dbn, "name": after_classes[dbn, next(iter(current[dbn]))][0],
            "programs": sorted(current[dbn]),
            "before": {"enrolled": then, "students": old_n, "classes": old_c},
            "after": {"enrolled": now, "students": new_n, "classes": new_c},
        }
        points.append(record)
        if enrollment_direction == "falling":
            changes["fallingEnrollment"] += 1
            changes[size_direction] += 1
            if size_direction != "unchanged":
                # Show the largest unrounded change in each direction among declining registers.
                shift = abs(delta) / (old_c * new_c)
                if size_direction not in examples or shift > examples[size_direction][0]:
                    examples[size_direction] = (shift, record)
    return {k: changes[k] for k in ("schools", "fallingEnrollment", "smaller", "larger", "unchanged")} | {
        "matrix": matrix,
        "examples": [examples[k][1] for k in ("larger", "smaller") if k in examples],
        "points": points,
    }


def quote(value):
    return "NULL" if value is None else str(value) if isinstance(value, int) else "'" + str(value).replace("'", "''") + "'"


def statements(table, rows):
    for start in range(0, len(rows), 100):
        section = rows[start:start+100]
        values = ",\n".join("(" + ",".join(map(quote, row)) + ")" for row in section)
        yield f"INSERT INTO {table} VALUES\n{values}\nON CONFLICT DO NOTHING;\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", type=Path, required=True, help="Local output only. No database operations.")
    parser.add_argument("--workbook-cache", type=Path, help="Optional directory of official .xlsx files for offline repeats")
    opts = parser.parse_args()
    if opts.workbook_cache:
        opts.workbook_cache.mkdir(parents=True, exist_ok=True)
    names = [B, C, *(f"{spec[0]}-class-size---{kind}" for spec in SPEC for kind in ("school", "district"))]
    with ThreadPoolExecutor(max_workers=4) as pool:
        books = dict(zip(names, pool.map(lambda name: download(name, opts.workbook_cache), names)))
    release, registers, classes, caps = [], [], [], []
    audit = {"workbooks": [books[name][1] for name in names]}
    by_year = {}
    for tab, year, observed, status, label in (
        ("25-26 Audited Registers", "2025-26", None, "audited", "2025–26 audited register"),
        ("26-27 Unaudited Registers", "2026-27", "2026-10-31", "preliminary", "October 31, 2026 preliminary register"),
        ("27-28 Projections", "2027-28", "2026-11-12", "forecast", "2027–28 forecast prepared November 12, 2026"),
    ):
        records = get_register(books[B][0], tab, year)
        by_year[year] = records
        rid = f"register-{year}-{status}"
        release.append((rid, "register", year, observed, label, 1, status, json.dumps([books[B][1] | {"sheet": tab}]), "{}"))
        registers.extend((rid, dbn, grade, *value) for dbn, counts in sorted(records.items()) for grade, value in counts.items())
    prior, latest = by_year["2025-26"], by_year["2026-27"]
    audit["registry"] = register_summary(prior, latest)
    s = audit["registry"]
    expect((s["beforeSchools"], s["afterSchools"], s["matchedSchools"], s["afterTotal"] - s["beforeTotal"], s["matchedAfter"] - s["matchedBefore"]) ==
           (1627, 1627, 1622, -23046, -22634), "Published register benchmark changed")
    expect(tuple(x["02M158"][g][0] for x in (prior, latest) for g in ("Total K-12", "K")) == (550, 92, 528, 96),
           "P.S. 158 register benchmark changed")
    release[1] = (*release[1][:-1], json.dumps(audit["registry"]))
    class_versions = {}
    for slug, year, date, label, revision, status in SPEC:
        school, district = (books[f"{slug}-class-size---{kind}"] for kind in ("school", "district"))
        values = class_rows(school[0])
        official = district_check(values, class_rows(district[0], district=True))
        class_versions[slug] = values
        rid = f"class-{slug}"
        cohort = {"schools": len({dbn for dbn, _ in values}), "programs": official}
        if slug == "november-2026-27":
            expect(cohort == {"schools": 35, "programs": {"Gen Ed": (1236, 60), "ICT": (816, 42)}}, "District 2 benchmark changed")
            expect(values["02M158", "Gen Ed"][1:] == (74, 4) and values["02M158", "ICT"][1:] == (21, 1), "P.S. 158 class benchmark changed")
            cohort["matched"] = matched_analysis(prior, latest, class_versions["february-2025-26"], values)
            cohort["schoolDistribution"] = pilot_class_sizes(school[0], values)
        release.append((rid, "class_size", year, date, label, revision, status, json.dumps([school[1], district[1]]), json.dumps(cohort)))
        classes.extend((rid, dbn, name, "K", program, count, class_count) for (dbn, program), (name, count, class_count) in sorted(values.items()))
        audit[slug] = cohort
    compliance = cap_rows(books[C][0])
    expect(compliance["02M158"] == (5, 4), "P.S. 158 official cap benchmark changed")
    cap_release = "cap-november-2026"
    release.append((cap_release, "cap", "2026-27", "2026-10-31", "November 2026", 1, "preliminary", json.dumps([books[C][1]]), "{}"))
    caps.extend((cap_release, dbn, "K", *values) for dbn, values in sorted(compliance.items()))
    audit["rows"] = {"releases": len(release), "registers": len(registers), "classProgramRows": len(classes), "capRows": len(caps)}
    opts.out_dir.mkdir(parents=True, exist_ok=True)
    with (opts.out_dir / "classroom-pilot.sql").open("w", encoding="utf-8", newline="\n") as f:
        for table, rows in zip(("releases", "register", "classes", "caps"), (release, registers, classes, caps)):
            f.writelines(statements("classroom_pilot_" + table, rows))
    (opts.out_dir / "audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in audit.items() if k != "workbooks"}, indent=2))


if __name__ == "__main__":
    main()
