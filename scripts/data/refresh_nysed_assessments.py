"""Build a versioned, additive D1 assessment import; no network/database writes."""
import argparse
from collections import Counter, defaultdict
import csv
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sqlite3
import zipfile


ARCHIVE_URL = "https://data.nysed.gov/files/essa/25-26/SRC2026.zip"
DIRECTORY_URL = "https://infohub.nyced.org/in-our-schools/operations/lcgms"
RELEASED = "2026-11-19"
DICTIONARY = "SRC2026ReadMe_Group1.pdf"
PLAN = {
    "science": {"Science5": 5, "Science8": 8},
    "ela": {**{f"ELA{i}": i for i in range(3, 9)}, "ELA3_8": 0},
    # The dictionary uses mixed case; the actual archive stores MATH3…MATH8.
    "math": {f"MATH{i}": i for i in range(3, 9)},
}
BOROUGHS = {"31": "M", "32": "X", "33": "K", "34": "Q", "35": "R"}
DBN = re.compile(r"[0-9]{2}[MXKQR][0-9A-Z]{3}\Z")
NUMBER = re.compile(r"[0-9]{12}\Z")
DISTRICT_BEDS = re.compile(r"3[1-5]([0-9]{2})00010000\Z")
DISTRICT_LABEL = re.compile(r"NYC GEOG DIST #\s*(\d+)\s*-", re.IGNORECASE)
REGULAR_DEFINITION = "nysed:regular-grade:v1"
MISSING = {"", "-", "—", "n/a", "na", "null"}


def file_hash(path):
    from hashlib import file_digest
    with path.open("rb") as f:
        return file_digest(f, "sha256").hexdigest()


class DirectoryTable(HTMLParser):
    """LCGMS's .xls is a UTF-16 HTML table with optional closing TRs."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.cells, self.content = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.finish_row()
            self.cells = []
        elif tag in ("td", "th") and self.cells is not None:
            self.finish_cell()
            self.content = []

    def handle_endtag(self, tag):
        if tag in ("td", "th"):
            self.finish_cell()
        elif tag == "tr":
            self.finish_row()

    def handle_data(self, data):
        if self.content is not None:
            self.content.append(data)

    def finish_cell(self):
        if self.content is not None:
            self.cells.append("".join(self.content).strip())
            self.content = None

    def finish_row(self):
        self.finish_cell()
        if self.cells:
            self.rows.append(self.cells)
        self.cells = None


def load_directory(path):
    parser = DirectoryTable()
    parser.feed(path.read_text(encoding="utf-16"))
    parser.finish_row()
    header = parser.rows[0]
    titles = ["ATS System Code", "BEDS Number", "Location Name", "Managed By Name", "Status Description", "Primary Address", "Zip"]
    if not all(col in header for col in titles):
        raise ValueError("LCGMS directory columns changed")
    indices = [header.index(c) for c in titles]
    result = defaultdict(dict)
    for cells in parser.rows[1:]:
        if len(cells) <= max(indices):
            continue
        dbn, beds, name, managed, status, address, zip_code = (cells[i] for i in indices)
        dbn = dbn.upper()
        if DBN.fullmatch(dbn) and NUMBER.fullmatch(beds) and status.casefold() == "open":
            result[beds][(dbn, managed.casefold(), address, zip_code)] = {
                "dbn": dbn, "name": name, "managed": managed.casefold(), "address": address, "zip": zip_code,
            }
    if not result:
        raise ValueError("LCGMS had no open schools with both identifiers")
    return {beds: list(entries.values()) for beds, entries in result.items()}


def read_int(raw):
    value = str(raw or "").strip().casefold() if raw != 0 else "0"
    if value in MISSING:
        return None
    if value == "s":
        return None
    if re.fullmatch(r"\d+(\.0+)?", value.replace(",", "")):
        return int(value.replace(",", "").split(".")[0])
    raise ValueError(f"Unexpected count {raw!r}")


def measures(row):
    fields = ["TOTAL_COUNT", "NUM_TESTED", "NUM_PROF", "PER_PROF"]
    eraw, traw, nraw, praw = (row.get(k, "").strip() for k in fields)
    eligible, tested, prof = map(read_int, (eraw, traw, nraw))
    if tested is not None and eligible is not None and tested > eligible:
        raise ValueError("tested_above_eligible")
    if tested == 0:
        if prof not in (None, 0):
            raise ValueError("nonzero_proficient_with_zero_tested")
        return eligible, tested, None, None, "zero_tested"
    if tested is not None and prof is not None and prof > tested:
        raise ValueError("proficient_above_tested")
    if any(x.casefold() == "s" for x in (traw, nraw, praw)):
        return eligible, tested, None, None, "suppressed"
    published = None if praw.casefold() in MISSING else float(praw.rstrip("%"))
    if published is not None and not 0 <= published <= 100:
        raise ValueError("published_percent_out_of_range")
    if tested is not None and prof is not None:
        return eligible, tested, prof, published, "count"
    if tested is not None and published is not None:
        return eligible, tested, None, published, "published_percent"
    return eligible, tested, None, None, "missing"


def district_science_row(row, release_id):
    """Accept the official district total, never a rollup of mapped profiles."""
    beds, inst = (row[key].strip() for key in ("ENTITY_CD", "INSTITUTION_ID"))
    match = DISTRICT_BEDS.fullmatch(beds)
    assessment = row["ASSESSMENT_NAME"].strip()
    if not match or assessment not in PLAN["science"] or row["ESTIMATE_FLAG"].strip().upper()=="Y":
        return None
    district = int(match[1])
    label = DISTRICT_LABEL.match(row["ENTITY_NAME"].strip())
    year = read_int(row["YEAR"])
    if not 1 <= district <= 32 or not label or int(label[1]) != district or not NUMBER.fullmatch(inst) or year not in (2025,2026):
        raise ValueError(f"Unverified science district identity or year: {beds} {year}")
    population = row["SUBGROUP_NAME"].strip()
    if population != "All Students":
        return None
    eligible, tested, proficient, _, status = measures(row)
    if status != "count":
        return None
    return (release_id,district,year,assessment,population,REGULAR_DEFINITION,inst,beds,eligible,tested,proficient)


def read_district_science(path, release_id):
    with path.open(encoding="utf-8-sig",newline="") as src:
        rows = sorted(result for row in csv.DictReader(src) if (result := district_science_row(row,release_id)) is not None)
    keys = {row[1:4] for row in rows}
    expected = {(district,year,assessment) for district in range(1,33) for year in (2025,2026) for assessment in PLAN["science"]}
    if len(keys) != len(rows) or keys != expected:
        raise ValueError("District science archive has duplicate or missing geographic district results")
    if {r[2]:r[-2:] for r in rows if r[1]==2 and r[3]=="Science5"} != {2025:(1960,1318),2026:(2013,1320)}:
        raise ValueError("District 2 grade 5 science fixture failed")
    return rows


STREET_TERMS = {
    "STREET": "ST", "AVENUE": "AVE", "BOULEVARD": "BLVD", "PLACE": "PL",
    "ROAD": "RD", "DRIVE": "DR", "LANE": "LN", "PARKWAY": "PKWY",
    "EAST": "E", "WEST": "W", "NORTH": "N", "SOUTH": "S", "COURT": "CT",
}
def street(string):
    # Only compare the street portion. A missing/placeholder legacy address
    # cannot confirm an otherwise uncertain charter location.
    value = str(string or "").upper().split(",")[0]
    value = re.sub(r"\b(\d+)(ST|ND|RD|TH)\b", r"\1", value)
    value = re.sub(r"\s+(?:FLOOR|ROOM|SUITE|APT|UNIT|#)\s+.*$", "", value)
    value = re.sub(r"[^A-Z0-9 -]", " ", value)
    terms = [STREET_TERMS.get(s,s) for s in value.split()]
    return " ".join(terms)


def charter(beds):
    return beds[6:8] == "86"


def resolve(row, directory, roster, id_beds, beds_ids, dbn_beds):
    beds, inst = row["ENTITY_CD"], row["INSTITUTION_ID"]
    if len(id_beds[inst]) != 1:
        return None, "institution_beds_changed"
    if len(beds_ids[beds]) != 1:
        return None, "beds_multiple_institutions"
    candidates = directory.get(beds, [])
    if not candidates:
        return None, "no_open_lcgms_beds"
    if len(candidates) != 1:
        return None, "ambiguous_lcgms_beds"
    official = candidates[0]
    dbn = official["dbn"]
    if len(dbn_beds[dbn]) != 1:
        return None, "dbn_multiple_directory_beds"
    if dbn[2] != BOROUGHS.get(beds[:2]) or (dbn.startswith("84") != charter(beds)):
        return None, "borough_or_sector_conflict"
    if ("charter" in official["managed"]) != charter(beds):
        return None, "directory_sector_conflict"
    if dbn not in roster:
        return None, "no_existing_profile"
    if charter(beds):
        profile = roster[dbn]
        current, legacy = street(official["address"]), street(profile.get("address"))
        if not re.match(r"\d", current) or not re.match(r"\d", legacy):
            return None, "charter_address_unverified"
        if current != legacy:
            return None, "charter_address_mismatch"
    return dbn, None


def prepare(source, archive, phase):
    roster_rows = json.loads((source/"staging-schools.json").read_text(encoding="utf-8-sig"))
    roster = {row["dbn"]:row for row in roster_rows}
    if len(roster) != len(roster_rows):
        raise ValueError("Duplicate canonical DBNs in the staging baseline")
    directory_file = source/"LCGMS-download"
    directory = load_directory(directory_file)
    directory_hash, archive_hash = file_hash(directory_file), file_hash(archive)
    with zipfile.ZipFile(archive) as z:
        dictionary_hash = sha256(z.read(DICTIONARY)).hexdigest()
    release_id = f"nysed-src2026-{archive_hash[:16]}"
    dbn_beds, id_beds, beds_ids = defaultdict(set), defaultdict(set), defaultdict(set)
    for beds, entries in directory.items():
        for row in entries:
            dbn_beds[row["dbn"]].add(beds)
    input_rows = []
    subjects = ["science"] if phase=="science" else ["science","ela","math"]
    for subject in subjects:
        with (source/(subject+".csv")).open(encoding="utf-8-sig",newline="") as f:
            csv_rows = list(csv.DictReader(f))
        if not csv_rows:
            raise ValueError(f"Empty extract: {subject}")
        for row in csv_rows:
            inst, beds = (row[key].strip() for key in ("INSTITUTION_ID","ENTITY_CD"))
            if not NUMBER.fullmatch(beds) or beds[:2] not in BOROUGHS or beds[8:]=="0000":
                continue
            if subject!="science" and not charter(beds):
                continue
            if not NUMBER.fullmatch(inst):
                raise ValueError("NYSED school institution must have a 12-digit ID")
            row.update(INSTITUTION_ID=inst,ENTITY_CD=beds,subject=subject)
            input_rows.append(row)
            id_beds[inst].add(beds)
            beds_ids[beds].add(inst)

    facts = []
    source_keys, target_keys = set(), set()
    quarantined = []
    outcomes = defaultdict(dict)
    counts = defaultdict(Counter)
    for row in sorted(input_rows,key=lambda r:(r["subject"],r["INSTITUTION_ID"],r["YEAR"],r["ASSESSMENT_NAME"])):
        subject, assessment = row["subject"], row["ASSESSMENT_NAME"].strip()
        if row["SUBGROUP_NAME"].strip()!="All Students":
            raise ValueError("Extract contains a population outside All Students")
        if assessment not in PLAN[subject] or row["ESTIMATE_FLAG"].strip().upper()=="Y":
            counts[subject]["excluded_alternate_or_summary"]+=1
            continue
        year = read_int(row["YEAR"])
        if year not in (2025,2026):
            raise ValueError("Unexpected source reporting year")
        inst, beds = row["INSTITUTION_ID"],row["ENTITY_CD"]
        source_key = (inst,year,assessment)
        if source_key in source_keys:
            raise ValueError(f"Duplicate source assessment: {source_key}")
        source_keys.add(source_key)
        grade = PLAN[subject][assessment]
        diagnostic = {"subject":subject,"assessment":assessment,"year":year,"beds":beds,"institution_id":inst,"name":row["ENTITY_NAME"]}
        try:
            value = measures(row)
        except ValueError as err:
            quarantined.append(diagnostic | {"reason":"invalid_measures","detail":str(err)})
            counts[subject]["invalid_measures"]+=1
            continue
        dbn, reason = resolve(row,directory,roster,id_beds,beds_ids,dbn_beds)
        if year==2026 and value[-1] in ("count","published_percent") and charter(beds):
            outcomes[subject].setdefault(inst,{"dbn":dbn,"reason":reason,"grade":False,"published_ela_aggregate":False})
            outcomes[subject][inst]["grade"] |= grade!=0
            outcomes[subject][inst]["published_ela_aggregate"] |= assessment=="ELA3_8"
        if reason:
            quarantined.append(diagnostic | {"reason":reason,"candidate_dbns":sorted({candidate["dbn"] for candidate in directory.get(beds,[])})})
            counts[subject][reason]+=1
            continue
        target_key=(dbn,year,assessment)
        if target_key in target_keys:
            raise ValueError(f"Duplicate mapped assessment: {target_key}")
        target_keys.add(target_key)
        definition=REGULAR_DEFINITION if grade else "nysed:ela3-8:published-nonestimated:v1"
        facts.append((release_id,dbn,year,subject,assessment,grade,"All Students",definition,inst,beds,directory_hash,*value))
        counts[subject]["stored_"+value[-1]]+=1

    coverage={}
    for subject in subjects:
        usable=outcomes[subject]
        latest_by_id={f[8]:f[1] for f in facts if f[2]==2026 and f[3]==subject and f[-1] in ('count','published_percent')}
        existing,existing_2026=0,0
        for inst in usable.keys() & latest_by_id.keys():
            profile=roster[latest_by_id[inst]]
            fields=[subject+"_proficiency"]+[f"{subject}_grade{k}" for k in ((5,8) if subject=="science" else range(3,9))]
            had_result=any(profile.get(field) is not None for field in fields)
            existing+=had_result
            existing_2026+=had_result and (profile.get("science_assessment_year") if subject=="science" else profile.get("assessment_year")) in ("2025-26","2025-2026","2026")
        matched=len(usable.keys()&latest_by_id.keys())
        published_aggregate={i for i,x in usable.items() if x["published_ela_aggregate"]}
        coverage[subject]={
            "source_charter_institutions":len(usable),"source_charter_with_grade_rows":sum(x["grade"] for x in usable.values()),
            "source_charter_with_published_ela_aggregate":sum(x["published_ela_aggregate"] for x in usable.values()),
            "matched_charters_with_published_ela_aggregate":len(published_aggregate & latest_by_id.keys()),
            "unresolved_charters_with_published_ela_aggregate":len(published_aggregate - latest_by_id.keys()),
            "matched_charter_institutions":matched,"matched_charters_with_legacy_result":existing,
            "matched_charters_with_legacy_2026":existing_2026,"matched_charters_gaining_first_result":matched-existing,
            "matched_charters_gaining_2026":matched-existing_2026,
            "unmatched_or_quarantined_charter_institutions":len(usable)-matched,
            "unmatched_charter_institutions_by_reason":dict(Counter(x["reason"] for i,x in usable.items() if i not in latest_by_id)),
            "all_matched_profiles_2026":len({f[1] for f in facts if f[2]==2026 and f[3]==subject and f[-1] in ('count','published_percent')}),
        }
    science_ps158 = {f[2]:(f[12],f[13]) for f in facts if f[1]=="02M158" and f[4]=="Science5"}
    if science_ps158!={2025:(87,62),2026:(83,69)} or any(f[1]=="02M158" and f[4]=="Science8" for f in facts):
        raise ValueError(f"P.S. 158 science fixture failed: {science_ps158}")
    report = {
        "source_url":ARCHIVE_URL,"archive_sha256":archive_hash,"dictionary_sha256":dictionary_hash,
        "release_date":RELEASED,"release_id":release_id,"directory_url":DIRECTORY_URL,"directory_sha256":directory_hash,
        "legacy_baseline":"Cloudflare D1 staging school roster","baseline_school_count":len(roster),
        "phase":phase,"release_rows":len(facts),"coverage":coverage,"diagnostic_row_counts":counts,
    }
    if phase=="all":
        ela=coverage["ela"]
        if ela["source_charter_with_published_ela_aggregate"]!=238:
            raise ValueError(f"NYC charter ELA coverage gate failed: {ela}")
        if not coverage["math"]["matched_charter_institutions"]:
            raise ValueError("No NYC charters with matched regular math; verify source assessment names")
    return (release_id,ARCHIVE_URL,RELEASED,archive_hash,dictionary_hash),facts,quarantined,report


def sql_value(value):
    if value is None:
        return "NULL"
    if isinstance(value,(int,float)):
        return str(value)
    return "'"+value.replace("'","''")+"'"


def import_statements(table, rows):
    # Identical replay does nothing. Import verification compares every stored
    # value against the validated manifest instead of quietly replacing a fact.
    for start in range(0,len(rows),75):
        values=",\n".join("("+",".join(map(sql_value,row))+")" for row in rows[start:start+75])
        yield f"INSERT INTO {table} VALUES\n{values}\nON CONFLICT DO NOTHING;\n"


def rehearse(migration, data, facts, district_data, district_rows):
    assert len(facts)==len({(r[0],r[1],r[2],r[4],r[6]) for r in facts})
    with sqlite3.connect(":memory:") as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("CREATE TABLE schools(dbn TEXT PRIMARY KEY)")
        conn.executemany("INSERT INTO schools VALUES(?)",[(dbn,) for dbn in sorted({row[1] for row in facts})])
        conn.executescript(migration)
        conn.executescript(data)
        first=set(conn.execute("SELECT * FROM school_assessment_archive_results"))
        assert first==set(facts)
        conn.executescript(data)
        assert set(conn.execute("SELECT * FROM school_assessment_archive_results"))==first
        conn.executescript(district_data)
        assert set(conn.execute("SELECT * FROM school_assessment_archive_district_science"))==set(district_rows)
        conn.executescript(district_data)
        assert set(conn.execute("SELECT * FROM school_assessment_archive_district_science"))==set(district_rows)
        assert conn.execute("PRAGMA foreign_key_check").fetchall()==[]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=Path,required=True)
    parser.add_argument("--archive",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--phase",choices=["science","all"],required=True)
    args=parser.parse_args()
    release,facts,rejected,report=prepare(args.source,args.archive,args.phase)
    district_rows=read_district_science(args.source/"science.csv",release[0])
    report["district_science_rows"]=len(district_rows)
    data="".join(import_statements("school_assessment_archive_releases",[release]))+"".join(
        import_statements("school_assessment_archive_results",facts))
    district_data="".join(import_statements("school_assessment_archive_district_science",district_rows))
    migration="\n".join(Path(f"migrations-d1/{name}.sql").read_text(encoding="utf-8") for name in (
        "0014_nysed_profile_assessments","0015_nysed_district_science"))
    rehearse(migration,data,facts,district_data,district_rows)
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/"import.sql").write_text(data,encoding="utf-8")
    (args.out/"district-science-import.sql").write_text(district_data,encoding="utf-8")
    (args.out/"expected-district-science.json").write_text(json.dumps(district_rows,separators=(",",":")),encoding="utf-8")
    (args.out/"coverage.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    (args.out/"quarantine.json").write_text(json.dumps(rejected,indent=2)+"\n",encoding="utf-8")
    with (args.out/"verified-crosswalk.csv").open("w",newline="",encoding="utf-8") as f:
        writer=csv.writer(f)
        writer.writerow(("dbn","institution_id","beds_code","directory_sha256"))
        writer.writerows(sorted({(r[1],r[8],r[9],r[10]) for r in facts}))
    (args.out/"expected-results.json").write_text(json.dumps(facts,separators=(",",":")),encoding="utf-8")
    (args.out/"rollback.sql").write_text(
        f"DELETE FROM school_assessment_archive_district_science WHERE release_id={sql_value(release[0])};\n"
        f"DELETE FROM school_assessment_archive_results WHERE release_id={sql_value(release[0])};\n"
        f"DELETE FROM school_assessment_archive_releases WHERE id={sql_value(release[0])};\n",encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__=="__main__":
    main()
