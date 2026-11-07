"""Independent XLSX-reader validation of every published comparison and snapshot.

Uses openpyxl instead of the importer's XML parser, and recalculates rates from
source numerator/denominator counts. Read only; does not modify source or D1.
"""
from pathlib import Path
import json, hashlib, math
import openpyxl

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT.parent/'marketing-audit-nov7/education-releases'
evidence=json.loads((ROOT/'client/public/data/score-movers-2026.json').read_text(encoding='utf-8'))
checks={'assessments':0,'regentsPairs':0,'regentsSnapshots':0,'sourceHashes':0,'numeratorChecks':0,'publishedRateOnly':0,'independentReader':'openpyxl read_only; source counts independently recomputed where public; suppressed counts never reconstructed'}

def read(name,sheet,dbn_key):
    workbook=openpyxl.load_workbook(BASE/name,read_only=True,data_only=True)
    iterator=workbook[sheet].iter_rows(values_only=True);headers=next(iterator);out={}
    for values in iterator:
        row=dict(zip(headers,values))
        if str(row.get('Year')) not in ['2025','2026'] or row.get('Category')!='All Students':continue
        grain=row['Grade'] if 'Grade' in row else row['Regents Exam']
        key=(row[dbn_key],int(row['Year']),str(grain))
        assert key not in out,('duplicate independent source key',key)
        out[key]=row
    workbook.close()
    return out

def public_number(value):
    try:return float(value)
    except (ValueError,TypeError):return None

def check_rate(row,rate,numerator,denominator,expected):
    assert isinstance(row[denominator],(int,float)) and row[denominator]>=50
    count=public_number(row[numerator])
    if count is not None:
        assert abs(100*count/row[denominator]-expected)<=0.11
        checks['numeratorChecks']+=1
    else:
        checks['publishedRateOnly']+=1
    assert abs(float(row[rate])-expected)<0.000001

for source in evidence['sources']:
    assert hashlib.sha256((BASE/source['file']).read_bytes()).hexdigest()==source['sha256']
    checks['sourceHashes']+=1
for subject,sheet in [('ela','ELA - All'),('math','Math - All')]:
    source=read('school-'+subject+'-results-public.xlsx',sheet,'DBN')
    for item in evidence['assessments'][subject]:
        dbn=item['dbn'];a=source[dbn,2025,'All Grades'];b=source[dbn,2026,'All Grades']
        for row,endpoint,year in [(a,'previous',2025),(b,'current',2026)]:
            check_rate(row,'% Level 3+4','# Level 3+4','Number Tested',item[endpoint])
            assert row['Number Tested']==item[endpoint+'Tested']
        assert abs(round(item['current']-item['previous'],1)-item['change'])<0.001
        assert dbn not in ['15K418','75M732']
        assert 0.75<=item['currentTested']/item['previousTested']<=1.25
        grades=[];adjusted=0;complete=True
        for g in range(3,9):
            x=source.get((dbn,2025,str(g)));y=source.get((dbn,2026,str(g)))
            xn=x.get('Number Tested') if x else None;yn=y.get('Number Tested') if y else None
            if not isinstance(xn,(int,float)) or xn<=0:
                assert not isinstance(yn,(int,float)) or yn<=0
                continue
            assert isinstance(yn,(int,float)) and yn>0
            grades.append(g)
            assert abs(xn/item['previousTested']-yn/item['currentTested'])<=0.10
            xp=x.get('% Level 3+4');yp=y.get('% Level 3+4')
            if isinstance(xp,(int,float)) and isinstance(yp,(int,float)):adjusted+=xn/item['previousTested']*(yp-xp)
            else:complete=False
        assert grades==item['testedGrades']
        if complete:
            assert abs(round(adjusted,1)-item['gradeAdjustedChange'])<0.001
            assert round(adjusted,1)*(item['current']-item['previous'])>=0
        else:assert item['gradeAdjustedChange'] is None
        checks['assessments']+=1
    print(subject,'independent source reconciliation passed',flush=True)
regents=read('nyc-regents-overall-and-by-category---public.xlsx','All Students','School DBN')
for key,report in evidence['regents'].items():
    exam=report['sourceExam']
    if key in ['english','algebra']:assert report['pairs']==[]
    for item in report['pairs']:
        a=regents[item['dbn'],2025,exam];b=regents[item['dbn'],2026,exam]
        for row,endpoint in [(a,'previous'),(b,'current')]:
            check_rate(row,'Percent Scoring 65 or Above','Number Scoring 65 or Above','Total Tested',item[endpoint])
            assert row['Total Tested']==item[endpoint+'Tested']
            assert row['School Level'] in ['High school','Secondary School','K-12 all grades']
            assert row['Mean Score']==item[endpoint+'Mean']
        assert 0.75<=item['currentTested']/item['previousTested']<=1.25
        assert abs(round(item['current']-item['previous'],1)-item['change'])<0.001
        checks['regentsPairs']+=1
    for item in report['snapshot']:
        row=regents[item['dbn'],2026,exam]
        check_rate(row,'Percent Scoring 65 or Above','Number Scoring 65 or Above','Total Tested',item['current'])
        assert row['Total Tested']==item['currentTested']
        assert row['Mean Score']==item['meanScore']
        if public_number(row['Percent Scoring 80 or Above']) is not None:
            assert abs(public_number(row['Percent Scoring 80 or Above'])-item['scoring80'])<0.00001
        else:assert item['scoring80'] is None
        checks['regentsSnapshots']+=1
    print(key,'independent Regents reconciliation passed',flush=True)
(ROOT/'.wrangler/score-movers/independent-validation.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps(checks,indent=2))
