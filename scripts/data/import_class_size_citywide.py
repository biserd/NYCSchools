"""Generate additive D1 snapshot imports from the public NYCPS workbooks."""
from argparse import ArgumentParser
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import sqlite3

from import_classroom_pilot import C, DBN, SPEC, download, expect, statements

RELEASES = (*SPEC[:2], ('june-2025-26','2025-26','2026-06-15','June 2026',1,'term-end'), SPEC[2])
LATEST = RELEASES[-1][0]


def normalized_grade(value):
    value = str(value).strip()
    if value in ('0K','K'):
        return 'K'
    if value.isdigit():
        expect(1 <= int(value) <= 6, f'Unexpected official class grade: {value}')
        return str(int(value))
    expect(value.startswith('Bridge - ES ') or value == 'K-8 SC', f'Unexpected official class group: {value}')
    return value


def section_rows(book, scope):
    result = {}
    for sheet, category in (('K-5 Average','K5'),('MS HS Average','course')):
        rows = iter(book[sheet].values)
        column = {name:i for i,name in enumerate(next(rows))}
        id_column = 'DBN' if scope == 'school' else 'District'
        for row in rows:
            def get(name, fallback=None):
                return row[column[name]] if name in column else fallback
            ident = str(get(id_column)).strip()
            if scope == 'school':
                if not DBN.fullmatch(ident):
                    continue
            else:
                if not ident.isdigit():
                    continue
                ident = ident.zfill(2)
                if not 1 <= int(ident) <= 32:
                    continue
            if category == 'K5':
                if get('Subject','Official Class') != 'Official Class':
                    continue
                band, group, department = 'K5', normalized_grade(get('Grade Level')), ''
            else:
                band, group, department = (get(k) for k in ('Grade Band','Subject','Department'))
                expect(band in ('MS','HS') and all(isinstance(v,str) and v.strip() for v in (group,department)),
                       f'Invalid secondary program dimensions: {ident} {band} {group} {department}')
            program = get('Program Type')
            students, classes = get('Number of Students'), get('Number of Classes')
            expect(isinstance(program,str) and program.strip() and all(type(v) is int and v > 0 for v in (students,classes))
                   and students >= classes, f'Invalid class counts: {ident} {group} {program}: {students}/{classes}')
            def bound(name):
                value = get(name)
                if value is None or str(value).strip() in ('','-','N/A'):
                    return None
                value = str(value).strip()
                expect(re.fullmatch(r'[<>]?\d+',value), f'Unexpected published range marker: {value}')
                return value
            key = ident, band, group, department, program
            expect(key not in result, f'Duplicate source grain: {sheet} {key}')
            result[key] = (students,classes,bound('Minimum Class Size'),bound('Maximum Class Size'))
    return result


def cap_rows(book):
    result = {}
    for sheet, kind in (('26-27 K-5 by DBN & Grade','grade'),('26-27 6-12 by DBN & Course','course')):
        rows = iter(book[sheet].values)
        col = {name:i for i,name in enumerate(next(rows))}
        for row in rows:
            dbn = row[col['DBN']]
            if not isinstance(dbn,str) or not DBN.fullmatch(dbn):
                continue
            if kind == 'grade':
                if row[col['Subject']] != 'Official Class':
                    continue
                key = dbn, kind, normalized_grade(row[col['Grade Level']])
            else:
                title = row[col['Course']]
                expect(isinstance(title,str) and title.strip(), f'Invalid cap course: {dbn} {title}')
                key = dbn, kind, title
            eligible, meeting, over = (row[col[name]] for name in ('Total # of classes','Total # of classes at or below cap','Total # of classes over cap'))
            expect(key not in result and all(type(v) is int and v >= 0 for v in (eligible,meeting,over))
                   and eligible == meeting+over, f'Invalid/duplicate cap counts: {key}')
            if eligible:
                result[key] = eligible,meeting
    return result


def combine(schools, districts):
    totals = defaultdict(lambda:[0,0])
    for (dbn,*group), (students,classes,*_) in schools.items():
        rollup = totals[(dbn[:2],*group)]
        rollup[0] += students
        rollup[1] += classes
    verified = {key for key,value in districts.items() if tuple(totals[key]) == value[:2]}
    return verified, Counter(key[1] for key in districts.keys()-verified)


def sample_k(schools, ident):
    rows = [value for key,value in schools.items() if key[0]==ident and key[1:4]==('K5','K','') and key[-1] in ('Gen Ed','ICT')]
    return [sum(row[i] for row in rows) for i in range(2)]


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--out-dir',type=Path,required=True)
    parser.add_argument('--workbook-cache',type=Path,required=True)
    parser.add_argument('--roster',type=Path,required=True,help='Public D1 canonical schools JSON array')
    args = parser.parse_args()
    roster_rows = json.loads(args.roster.read_text(encoding='utf-8-sig'))
    roster = {r['dbn'] for r in roster_rows}
    expect(len(roster)==len(roster_rows),'Canonical roster contains duplicate DBNs')
    args.workbook_cache.mkdir(parents=True,exist_ok=True)
    sources = [C,*[id+'-class-size---'+scope for id,*_ in RELEASES for scope in ('school','district')]]
    with ThreadPoolExecutor(max_workers=4) as pool:
        books = dict(zip(sources,pool.map(lambda name: download(name,args.workbook_cache), sources)))
    cap, cap_source = books[C]
    caps = cap_rows(cap)
    expect(caps['02M158','grade','K']==(5,4),'P.S. 158 cap fixture changed')
    release_out, section_out, cap_out = [], [], []
    report = {'releases':{},'caps':len(caps)}
    for id,year,observed,label,revision,_ in RELEASES:
        school_book, school_src = books[id+'-class-size---school']
        district_book, district_src = books[id+'-class-size---district']
        schools, districts = section_rows(school_book,'school'),section_rows(district_book,'district')
        verified,differences = combine(schools,districts)
        source = {'school':school_src,'district':district_src,'caps':cap_source if id==LATEST else None}
        release_out.append((id,observed,revision,label,json.dumps(source,separators=(',',':'))))
        section_out.extend((id,'school',*key,*values,0) for key,values in sorted(schools.items()))
        section_out.extend((id,'district',*key,*values,int(key in verified)) for key,values in sorted(districts.items()))
        all_schools = {key[0] for key in schools}
        matched = all_schools & roster
        report['releases'][id] = dict(observed=observed,revision=revision,sources=source,school_rows=len(schools),
            district_rows=len(districts),district_rows_verified=len(verified),unreconciled_by_band=differences,
            source_schools=len(all_schools),matched_profiles=len(matched),unmatched_dbns=sorted(all_schools-roster),
            matched_by_band={band:len({key[0] for key in schools if key[1]==band and key[0] in matched}) for band in ('K5','MS','HS')},
            matched_by_borough=dict(Counter(dbn[2] for dbn in matched)), ps158_k=sample_k(schools,'02M158'),
            district2_k=sample_k(districts,'02'))
        if id == LATEST:
            expect(sample_k(schools,'02M158')==[95,5] and sample_k(districts,'02')==[2052,102], 'October 2026 class-size fixture changed')
            expect(all(('02','K5','K','',program) in verified for program in ('Gen Ed','ICT')), 'District 2 fixture does not reconcile')
            expect(len(matched)>=1000 and {dbn[2] for dbn in matched} >= set('MXKQR'), 'Citywide profile coverage is incomplete')
    cap_out.extend((LATEST,*key,*values) for key,values in sorted(caps.items()))
    args.out_dir.mkdir(parents=True,exist_ok=True)
    migration = Path('migrations-d1/0017_citywide_class_sizes.sql').read_text()
    report['totals'] = {'releases':len(release_out),'sections':len(section_out),'caps':len(cap_out)}
    with sqlite3.connect(':memory:') as db:
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(migration)
        for ending,table,records in [('releases','city_class_size_releases',release_out),('sections','city_class_size_sections',section_out),('caps','city_class_size_caps',cap_out)]:
            data = ''.join(statements(table,records))
            for _ in range(2):
                db.executescript(data)
                expect(db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]==len(records), f'Unexpected duplicate count for {table}')
            (args.out_dir/(ending+'.sql')).write_text(data,encoding='utf-8')
        expect(not db.execute('PRAGMA foreign_key_check').fetchall(),'Source reference failed')
    (args.out_dir/'audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({id:{k:r[k] for k in ('matched_profiles','matched_by_band','matched_by_borough','unreconciled_by_band')} for id,r in report['releases'].items()}))
    print(report['totals'])


if __name__=='__main__':
    main()
