"""Independently reconcile rehearsed database values with downloaded source cells."""
from pathlib import Path
import sqlite3,json,gzip,hashlib,math
from nyc_import_values import exam
root=Path(__file__).resolve().parents[2]/'.wrangler/2026-refresh'
db=sqlite3.connect(root/'expected.sqlite');db.row_factory=sqlite3.Row
report=json.loads((root/'report.json').read_text(encoding='utf-8'))
schools={r['dbn']:dict(r) for r in db.execute('SELECT * FROM schools')}
def records(prefix,sheet):
    p=next((root/'source-cache').glob(prefix+'-'+sheet+'.jsonl.gz'))
    with gzip.open(p,'rt',encoding='utf-8') as f:
        for line in f:yield json.loads(line)
def raw_number(v):
    try:return float(str(v).replace('%','').replace(',',''))
    except ValueError:return None
def same(actual,expected,context):
    assert (actual is None and expected is None) or (actual is not None and expected is not None and math.isclose(actual,expected,abs_tol=.051)),context
counts={}
for subject,prefix,sheet in [('ela','5a8c419e64091c65','ELA___All'),('math','fc11957633937e32','Math___All')]:
    n=0
    for r in records(prefix,sheet):
        if r['DBN'] not in schools or r['Category']!='All Students':continue
        s=schools[r['DBN']]
        if r['Grade']=='All Grades':
            same(s[subject+'_proficiency'],raw_number(r['% Level 3+4']),r['DBN']+' '+subject)
            same(s[subject+'_tested_count'],raw_number(r['Number Tested']),r['DBN']+' tested')
            assert s['assessment_year']=='2025-26'
            assert s[subject+'_eligible_count'] is None and s[subject+'_participation_rate'] is None
            n+=1
        elif r['Grade'] in ['3','4','5','6','7','8']:
            same(s[subject+'_grade'+r['Grade']],raw_number(r['% Level 3+4']),r['DBN']+' grade '+r['Grade'])
    counts[subject+'SchoolsChecked']=n
mapping={'ell_percent':'% English Language Learners','iep_percent':'% Students with Disabilities','asian_percent':'% Asian and Pacific Islander','black_percent':'% Black','hispanic_percent':'% Hispanic','white_percent':'% White','multi_racial_percent':'% Multi-Racial','economic_need_index':'Economic Need Index'}
n=0
for r in records('d7759afaf3e1cd82','School'):
    if r['DBN'] not in schools:continue
    row=db.execute('SELECT data FROM school_demographics_history WHERE dbn=? AND school_year=?',(r['DBN'],r['Year'])).fetchone()
    assert row,(r['DBN'],r['Year']);data=json.loads(row['data'])
    same(data['enrollment'],raw_number(r['Total Enrollment']),r['DBN']+' enrollment')
    for field,column in mapping.items():
        v=raw_number(r[column]);same(data[field],v*100 if v is not None else None,r['DBN']+' '+field)
        if str(r[column]).startswith(('Above','Below')):assert data['reported_bounds'][field]==r[column]
    n+=1
counts['demographicSnapshotsChecked']=n
n=0
for r in records('252cafb1e680190f','All_Students'):
    if r['School DBN'] not in schools:continue
    row=db.execute('SELECT * FROM hs_regents WHERE dbn=? AND year=? AND exam_name=?',(r['School DBN'],int(r['Year']),exam(r['Regents Exam']))).fetchone()
    assert row,(r['School DBN'],r['Year'],r['Regents Exam'])
    for field,column in [('total_tested','Total Tested'),('pass_rate','Percent Scoring 65 or Above'),('college_ready_rate','Percent Scoring 80 or Above'),('mean_score','Mean Score')]:
        same(row[field],raw_number(r[column]),str((r['School DBN'],r['Year'],field)))
    n+=1
counts['regentsRowsChecked']=n
assert counts['elaSchoolsChecked']==counts['mathSchoolsChecked']==1126
assert counts['regentsRowsChecked']==sum(report['regentsRowsByYear'].values())
(root/'source-reconciliation.json').write_text(json.dumps(counts,indent=2)+'\n',encoding='utf-8')
print(json.dumps(counts,indent=2))
