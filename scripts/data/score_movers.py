"""Build a read-only, source-backed 2025/2026 editorial snapshot. Never writes D1."""
from pathlib import Path
import json, hashlib, sqlite3, re, statistics
from nyc_xlsx import workbook, rows
from nyc_import_values import number

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT.parent / 'marketing-audit-nov7/education-releases'
OUT = ROOT / '.wrangler/score-movers'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://infohub.nyced.org/docs/default-source/default-document-library/'

def read(name, sheet):
    p = SOURCE / name
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    cache = OUT / (digest[:16] + '.json')
    if cache.exists():
        return json.loads(cache.read_text(encoding='utf-8'))
    z, ss, sheets = workbook(p)
    notes = [' '.join(str(v) for v in r.values()) for r in rows(z, ss, sheets['Notes' if 'Notes' in sheets else 'NOTES'])]
    it = rows(z, ss, sheets[sheet]); header = next(it); selected = []
    for raw in it:
        r = {v: raw.get(k, '') for k, v in header.items()}
        if r.get('Year') in ['2025', '2026'] and r.get('Category') == 'All Students':
            selected.append(r)
    z.close()
    data = {'file': name, 'url': BASE + name, 'sha256': digest, 'notes': notes, 'rows': selected}
    cache.write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
    print(name, len(selected), 'selected rows', flush=True)
    return data

def value(r, key):
    n = number(r.get(key))
    if n is not None and (key.startswith('%') or key.startswith('Percent')):
        assert n <= 100.0001, (key, n)
    return n

def build(sources):
    db = sqlite3.connect('file:' + str(ROOT / '.wrangler/2026-refresh/expected.sqlite') + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    schools = {r['dbn']: dict(r) for r in db.execute('SELECT * FROM schools')}
    def identity(dbn):
        s = schools[dbn]
        # Matches getSchoolSlug: canonical DBN first, normalized public display name.
        slug = re.sub(r'[^a-z0-9\s-]', '', s['name'].lower())
        slug = re.sub(r'[\s-]+', '-', slug).strip('-')
        return {'dbn': dbn, 'name': s['name'], 'href': '/school/' + dbn.lower() + '-' + slug,
                'district': s['district'], 'borough': {'M':'Manhattan','K':'Brooklyn','Q':'Queens','X':'Bronx','R':'Staten Island'}.get(dbn[2], 'Other'), 'grades': s['grade_band']}
    def pair(a, b, pa, pb, na, nb):
        # Keep source published precision for deltas; final display rounds once.
        return {'previous': pa, 'current': pb, 'change': round(pb-pa, 1), 'previousTested': na, 'currentTested': nb}
    def report(key, title, candidates, excluded, comparable=True, reason=''):
        asc = sorted(candidates, key=lambda r: (r['change'], r['dbn']))
        desc = sorted(candidates, key=lambda r: (-r['change'], r['dbn']))
        stable100 = [r for r in candidates if min(r['previousTested'], r['currentTested']) >= 100]
        stages={}
        for stage in ['elementary','middle']:
            def serves(r):
                if r.get('testedGrades'):
                    return any(g<=5 for g in r['testedGrades']) if stage=='elementary' else any(g>=6 for g in r['testedGrades'])
                m=re.fullmatch(r'(PK|K|\d+)-(K|\d+)',r['grades'])
                if not m:return False
                lo=-1 if m[1]=='PK' else 0 if m[1]=='K' else int(m[1]); hi=0 if m[2]=='K' else int(m[2])
                return hi<=8 and (lo<=5 and hi>=0 if stage=='elementary' else lo<=8 and hi>=6)
            stages[stage]={'gains':[r for r in desc if r['change']>0 and serves(r)][:3], 'declines':[r for r in asc if r['change']<0 and serves(r)][:3]}
        return {'key':key,'label':title,'comparable':comparable,'reason':reason,'eligible':len(candidates),'stageMovers':stages,
                'boroughs':[{'borough':b,'eligible':len(rr),'medianChange':round(statistics.median(r['change'] for r in rr),1) if rr else None} for b in ['Manhattan','Brooklyn','Queens','Bronx','Staten Island'] if (rr:=[r for r in candidates if r['borough']==b])],
                'increased':sum(r['change']>0 for r in candidates),'decreased':sum(r['change']<0 for r in candidates),'unchanged':sum(r['change']==0 for r in candidates),
                'medianChange':round(statistics.median(r['change'] for r in candidates),1) if candidates else None,
                'gains':[r for r in desc if r['change']>0][:10], 'declines':[r for r in asc if r['change']<0][:10],
                'sensitivity100':{'eligible':len(stable100),'gains':[r['dbn'] for r in sorted(stable100,key=lambda r:(-r['change'],r['dbn'])) if r['change']>0][:10], 'declines':[r['dbn'] for r in sorted(stable100,key=lambda r:(r['change'],r['dbn'])) if r['change']<0][:10]},
                'excluded':excluded}
    published = {'prepared':'2026-11-07','previousYear':2025,'currentYear':2026,'sources':[{k:s[k] for k in ['file','url','sha256','notes']} for s in sources], 'assessments':{},'regents':{}}
    full = {'prepared':'2026-11-07','assessments':{},'regents':{}}
    validation = {'duplicateKeys':0,'percentageCountChecks':0,'historyChecks':0,'notes':['2025 profile history was stored as whole percentages; source precision is used for article changes. Reconciliation allows <=0.5 pp for 2025 and <=0.051 pp for the 2026 one-decimal import. Historical database values are not overwritten.']}
    for key, src in zip(['ela','math'], sources[:2]):
        records = {}; excluded = {}; result=[]
        for r in src['rows']:
            k=(r['DBN'],int(r['Year']),r['Grade'])
            assert k not in records, ('duplicate',k)
            records[k]=r
            n=value(r,'Number Tested');p=value(r,'% Level 3+4');passed=value(r,'# Level 3+4')
            if n and p is not None and passed is not None:
                assert abs(p-100*passed/n)<=0.11,(k,p,passed,n)
                validation['percentageCountChecks']+=1
        def reject(reason): excluded[reason]=excluded.get(reason,0)+1
        current = {r['DBN'] for r in src['rows'] if r['Year']=='2026' and r['Grade']=='All Grades'}
        for dbn in sorted(current):
            a=records.get((dbn,2025,'All Grades')); b=records[dbn,2026,'All Grades']
            if dbn not in schools or not 1<=int(dbn[:2])<=32: reject('Outside canonical district-school scope');continue
            if dbn in ['15K418','75M732']: reject('Changed attribution: Children’s School');continue
            if a is None: reject('Missing prior year');continue
            pa=value(a,'% Level 3+4');pb=value(b,'% Level 3+4');na=value(a,'Number Tested');nb=value(b,'Number Tested')
            if None in [pa,pb,na,nb]:reject('Missing or suppressed result/count');continue
            if min(na,nb)<50:reject('Fewer than 50 tested in a year');continue
            ga={g:records.get((dbn,2025,str(g))) for g in range(3,9)};gb={g:records.get((dbn,2026,str(g))) for g in range(3,9)}
            ga={g:r for g,r in ga.items() if r and (value(r,'Number Tested') or 0)>0};gb={g:r for g,r in gb.items() if r and (value(r,'Number Tested') or 0)>0}
            if ga.keys()!=gb.keys() or not ga:reject('Tested grade configuration changed/unavailable');continue
            if not 0.75<=nb/na<=1.25:reject('Tested count changed by more than 25%');continue
            if any(abs(value(ga[g],'Number Tested')/na-value(gb[g],'Number Tested')/nb)>0.10 for g in ga):reject('Grade share changed by more than 10 percentage points');continue
            # Reweight the grade changes to 2025 tested shares where all cells are public.
            grade_check=None
            if all(value(r,'% Level 3+4') is not None for r in [*ga.values(),*gb.values()]):
                grade_check=round(sum(value(ga[g],'Number Tested')/na*(value(gb[g],'% Level 3+4')-value(ga[g],'% Level 3+4')) for g in ga),1)
                if grade_check*(pb-pa)<0:reject('Direction reverses after fixing grade weights');continue
            # Editorial stage labels come from actual source-tested grades, not legacy directory grade bands.
            row={**identity(dbn),**pair(a,b,pa,pb,na,nb),'grades':'-'.join(map(str,[min(ga),max(ga)])),'gradeAdjustedChange':grade_check,'testedGrades':sorted(ga)}
            result.append(row)
            for yr,p in [(2025,pa),(2026,pb)]:
                stored=db.execute('SELECT '+key+'_proficiency FROM school_historical_scores WHERE dbn=? AND year=?',(dbn,yr)).fetchone()
                assert stored and abs(stored[0]-p)<=(0.5001 if yr==2025 else 0.051),(key,dbn,yr,'history mismatch')
                validation['historyChecks']+=1
        full['assessments'][key]=result
        published['assessments'][key]=report(key,key.upper() if key=='ela' else 'Math',result,excluded)
    src=sources[2]; records={}
    for r in src['rows']:
        k=(r['School DBN'],int(r['Year']),r['Regents Exam']); assert k not in records,('duplicate',k);records[k]=r
        n=value(r,'Total Tested');p=value(r,'Percent Scoring 65 or Above');passed=value(r,'Number Scoring 65 or Above')
        if n and p is not None and passed is not None:
            assert abs(p-100*passed/n)<=0.11,(k,p,passed,n)
            validation['percentageCountChecks']+=1
    exams=[('global-history','Global History and Geography',True,''),('us-history','US History and Government',True,''),
           ('english','Common Core English',False,'NYSED schedules a new English Language Arts exam in June 2026. The NYCPS annual file retains the label Common Core English and does not separate exam versions/administrations. A same-label join does not establish comparable 2025–2026 exams.'),
           ('algebra','Integrated Algebra',False,'The NYCPS file labels these rows Integrated Algebra, alongside separate Common Core Algebra rows. Its notes do not map either label to the Next Generation Algebra I exam introduced in June 2024. Without an authoritative version crosswalk we do not publish an Algebra I growth ranking.')]
    for key,label,comparable,reason in exams:
        result=[];snapshot=[];excluded={}
        for (dbn,year,exam),b in records.items():
            if year!=2026 or exam!=label:continue
            if dbn not in schools or b['School Level'] not in ['High school','Secondary School','K-12 all grades'] or not 1<=int(dbn[:2])<=32:continue
            p=value(b,'Percent Scoring 65 or Above');n=value(b,'Total Tested')
            if p is not None and n is not None and n>=50:
                snapshot.append({**identity(dbn),'grades':b['School Level'],'current':p,'currentTested':n,'meanScore':value(b,'Mean Score'),'scoring80':value(b,'Percent Scoring 80 or Above')})
            a=records.get((dbn,2025,label))
            why=None
            if not a:why='Missing prior-year same-exam record'
            elif a['School Level'] not in ['High school','Secondary School','K-12 all grades']:why='School level changed'
            else:
                pa=value(a,'Percent Scoring 65 or Above');na=value(a,'Total Tested')
                if None in [pa,p,na,n]:why='Missing or suppressed result/count'
                elif min(na,n)<50:why='Fewer than 50 tested in a year'
                elif not 0.75<=n/na<=1.25:why='Tested count changed by more than 25%'
            if why:excluded[why]=excluded.get(why,0)+1;continue
            if comparable:
                result.append({**identity(dbn),'grades':b['School Level'],**pair(a,b,pa,p,na,n),'previousMean':value(a,'Mean Score'),'currentMean':value(b,'Mean Score'),'previous80':value(a,'Percent Scoring 80 or Above'),'current80':value(b,'Percent Scoring 80 or Above')})
        full['regents'][key]={'pairs':result,'snapshot':snapshot,'sourceExam':label}
        published['regents'][key]={**report(key,label,result,excluded,comparable,reason),'sourceExam':label,'snapshotCount':len(snapshot),'snapshot':sorted(snapshot,key=lambda r:(-r['currentTested'],r['dbn']))[:10]}
    full['methodology']={'minimumTested':50,'testedCountRatio':[0.75,1.25],'maximumGradeShareChange':0.10,'childrenSchoolExcluded':['15K418','75M732'],'years':[2025,2026]}
    published['methodology']=full['methodology']
    (OUT/'full-evidence.json').write_text(json.dumps(full,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
    target=ROOT/'shared/generated/score-movers-2026.ts';target.parent.mkdir(exist_ok=True)
    target.write_text('// Generated by scripts/data/score_movers.py; source hashes and rules are included.\nimport type { ScoreMoverData } from "../score-movers-types";\nexport const scoreMoverData: ScoreMoverData = '+json.dumps(published,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    public=ROOT/'client/public/data';public.mkdir(exist_ok=True)
    (public/'score-movers-2026.json').write_text(json.dumps({'sources':published['sources'],**full},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(json.dumps({'assessments':{k:{f:v[f] for f in ['eligible','increased','decreased','excluded']} for k,v in published['assessments'].items()},'regents':{k:{f:v[f] for f in ['eligible','snapshotCount','comparable']} for k,v in published['regents'].items()},'validation':validation},indent=2),flush=True)

if __name__ == '__main__':
    sources = [read('school-ela-results-public.xlsx', 'ELA - All'), read('school-math-results-public.xlsx', 'Math - All'), read('nyc-regents-overall-and-by-category---public.xlsx', 'All Students')]
    for src in sources:
        if 'regents' in src['file']:
            print('Regents levels', sorted(set(r['School Level'] for r in src['rows'])))
            print('Regents exams', sorted(set(r['Regents Exam'] for r in src['rows'])))
        for r in src['rows'][:1]: print(r)
    build(sources)
