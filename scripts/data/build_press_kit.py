"""Export the already-validated public analysis for the website's media kit.
No workbook editing, new ingestion, D1 access or outbound messaging occurs.
"""
from pathlib import Path
import csv,json,hashlib,zipfile,io

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'client/public/press/2026-school-results'
OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((ROOT/'client/public/data/score-movers-2026.json').read_text(encoding='utf-8'))
source={('ela' if 'school-ela' in s['file'] else 'math' if 'school-math' in s['file'] else 'regents'):s for s in data['sources']}
files={}

def export(name,fields,records):
    with (OUT/name).open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields,extrasaction='raise');writer.writeheader();writer.writerows(records)
    # Reopen the written export, retaining literal zeros and blanks for null.
    with (OUT/name).open(encoding='utf-8-sig',newline='') as f:actual=list(csv.DictReader(f))
    assert len(actual)==len(records)
    for record,row in zip(records,actual):
        for field in fields:
            expected='' if record[field] is None else str(record[field])
            assert row[field]==expected,(name,field)
    files[name]={'rows':len(records),'columns':fields}

identity=['dbn','school_name','borough','district','profile_url']
def ident(r):
    return {'dbn':r['dbn'],'school_name':r['name'],'borough':r['borough'],'district':r['district'],'profile_url':'https://nycschoolsratings.com'+r['href']}
assessment=[]
for subject,records in data['assessments'].items():
    for r in records:
        assessment.append({**ident(r),'subject':subject.upper() if subject=='ela' else 'Math','tested_grades':';'.join(map(str,r['testedGrades'])),'previous_test_year':2025,'current_test_year':2026,'previous_school_year':'2024-25','current_school_year':'2025-26','previous_proficiency_pct':r['previous'],'current_proficiency_pct':r['current'],'change_pp_rounded_1dp':r['change'],'previous_tested':r['previousTested'],'current_tested':r['currentTested'],'fixed_2025_grade_weight_change_pp':r['gradeAdjustedChange'],'source_url':source[subject]['url'],'source_sha256':source[subject]['sha256'],'eligibility_method':'stability50-v1'})
export('ela-math-school-changes-2025-2026.csv',identity+['subject','tested_grades','previous_test_year','current_test_year','previous_school_year','current_school_year','previous_proficiency_pct','current_proficiency_pct','change_pp_rounded_1dp','previous_tested','current_tested','fixed_2025_grade_weight_change_pp','source_url','source_sha256','eligibility_method'],assessment)
pairs=[];snapshots=[]
for category,report in data['regents'].items():
    for r in report['pairs']:
        pairs.append({**ident(r),'source_exam_label':report['sourceExam'],'previous_reporting_year':2025,'current_reporting_year':2026,'previous_pass_rate_65plus_pct':r['previous'],'current_pass_rate_65plus_pct':r['current'],'change_pp_rounded_1dp':r['change'],'previous_tested':r['previousTested'],'current_tested':r['currentTested'],'previous_mean_score':r['previousMean'],'current_mean_score':r['currentMean'],'previous_scoring_80plus_pct':r['previous80'],'current_scoring_80plus_pct':r['current80'],'source_url':source['regents']['url'],'source_sha256':source['regents']['sha256'],'eligibility_method':'stability50-v1; same-label history exam'})
    for r in report['snapshot']:
        snapshots.append({**ident(r),'source_exam_label':report['sourceExam'],'reporting_year':2026,'tested':r['currentTested'],'pass_rate_65plus_pct':r['current'],'mean_score':r['meanScore'],'scoring_80plus_pct':r['scoring80'],'growth_comparison_status':'same-label history pairs published separately' if report['pairs'] else 'withheld: exam-version mapping unresolved','source_url':source['regents']['url'],'source_sha256':source['regents']['sha256']})
export('regents-history-changes-2025-2026.csv',identity+['source_exam_label','previous_reporting_year','current_reporting_year','previous_pass_rate_65plus_pct','current_pass_rate_65plus_pct','change_pp_rounded_1dp','previous_tested','current_tested','previous_mean_score','current_mean_score','previous_scoring_80plus_pct','current_scoring_80plus_pct','source_url','source_sha256','eligibility_method'],pairs)
export('regents-source-category-snapshots-2026.csv',identity+['source_exam_label','reporting_year','tested','pass_rate_65plus_pct','mean_score','scoring_80plus_pct','growth_comparison_status','source_url','source_sha256'],snapshots)
assert len(assessment)==1604 and len(pairs)==605 and len(snapshots)==1594
readme='''NYC SCHOOL RATINGS — 2026 SCHOOL RESULTS MEDIA KIT
Published November 7, 2026
Announcement: https://nycschoolsratings.com/blog/nyc-school-ratings-2026-data-release
Results guide: https://nycschoolsratings.com/blog/nys-test-results-2026
Media contact: hello@nycschoolsratings.com

WHAT THESE EXPORTS REPRESENT
The ELA/math CSV contains 1,604 school-subject comparisons, not 1,604 unique
schools: 843 ELA pairs and 761 math pairs. Regents history contains 605 school-exam
pairs: 314 Global History and Geography and 291 US History and Government.
The 1,594 Regents snapshots cover four exact source exam categories. They are
2026 snapshots, not 1,594 year-over-year growth comparisons.

YEARS AND UNITS
ELA/math: spring 2025 = 2024-25 school year; spring 2026 = 2025-26 school year.
The NYCPS ELA/math source snapshot is August 3, 2026 and may differ from final
NYSED data. Regents uses the source Year as a reporting year, without inventing
a school-year range. The source reports each student's highest numeric score
per exam across administrations in that school year.
Proficiency/pass rates and scoring-80+ fields are percentages (0-100).
Change fields are percentage points, rounded to one decimal. Source endpoints
retain their published precision. Mean scores are exam scores on a 0-100 scale.
Blank CSV cells mean unavailable; numeric zero remains zero. Scoring 80+ is a
score threshold, not a universal college-readiness measure.

ELIGIBILITY: stability50-v1
Exact canonical DBN, same All Students population, published values/counts in
both years, >=50 tested in each year, and current/prior tested ratio 0.75-1.25.
ELA/math also requires identical tested-grade sets and each grade's tested share
to move by <=10 percentage points. When grade proficiency cells are public,
fixed 2025 grade weights provide a direction check and reversals are excluded.
A blank fixed-grade adjustment means a full adjustment could not be computed;
the row's all-grade comparison is still public. Rankings use all-grade changes.
The Children's School is excluded because source DBN attribution changed.
Charter and District 75 records are outside the ELA/math school-file scope.
Regents pair comparisons use exact labels and district high-school records.
English and algebra growth rankings are withheld due to exam-version limits.
Do not relabel Integrated Algebra as verified Next Generation Algebra I.
No predecessor and new science exams are merged. No all-exam mean is published.

INTERPRETATION
Samples differ between subjects. School medians are not official student-weighted
city rates. Different students may be tested in each year. Changes do not establish
teaching effects, admissions eligibility or school quality. Historical profile
percentages may differ slightly because earlier imports rounded to whole numbers.
The subject articles show exclusions and a stricter 100-tested sensitivity check.
This is independent analysis of already-public files, not a new government release.

ATTRIBUTION AND REUSE
Please credit NYC School Ratings for the analysis and NYC Public Schools for the
source data, linking to the announcement and official source page. Original source
materials retain their applicable terms; no new license for those files is asserted.
CSV exports use UTF-8 with a BOM for spreadsheet compatibility. Source URLs and
SHA-256 hashes are included per record and in sources.json. Export checksums and
row counts are included in manifest.json.
'''
(OUT/'README.txt').write_text(readme,encoding='utf-8')
(OUT/'sources.json').write_text(json.dumps({'analysis_date':'2026-11-07','source_page':'https://infohub.nyced.org/reports/academics/test-results','sources':data['sources']},indent=2,ensure_ascii=False),encoding='utf-8')
names=['press-release.txt','README.txt','sources.json',*files]
manifest={'prepared':'2026-11-07','files':{name:{**files.get(name,{}),'bytes':(OUT/name).stat().st_size,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest()} for name in names}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
names.append('manifest.json')
zip_path=OUT/'nyc-school-results-2026-media-kit.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name in names:
        item=zipfile.ZipInfo(name,(2026,11,7,0,0,0));item.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(item,(OUT/name).read_bytes())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None and sorted(z.namelist())==sorted(names)
    for name in names:assert z.read(name)==(OUT/name).read_bytes()
print(json.dumps({'csvRows':{name:item['rows'] for name,item in files.items()},'zipBytes':zip_path.stat().st_size,'zipFiles':names},indent=2))
