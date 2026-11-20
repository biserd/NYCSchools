"""Read-only exploratory school-level analysis of fall 2025 NYCPS grade 5 classes.

Archive inputs are read-only Access extracts of Annual EM ELA, Math, Science:
year in (2025,2026), All Students, ELA5/MATH5/Science5, NYC ENTITY_CD prefix.
"""
import csv
from collections import Counter, defaultdict
import json
import math
import os
from pathlib import Path
import sqlite3
import sys

os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
import numpy as np

sys.path.insert(0,str(Path('scripts/data').resolve()))
from refresh_nysed_assessments import BOROUGHS, NUMBER, load_directory, measures, resolve

analysis=Path('dist/class-size-citywide/outcome-analysis')
src=Path('.wrangler/nysed-assessments/source')
roster=json.loads((src/'staging-schools.json').read_text(encoding='utf-8-sig'))
roster={r['dbn']:r for r in roster}
directory=load_directory(src/'LCGMS-download')
dbn_beds,id_beds,beds_ids=defaultdict(set),defaultdict(set),defaultdict(set)
for beds,matches in directory.items():
    for m in matches: dbn_beds[m['dbn']].add(beds)
subjects=dict(ELA='ELA5',Math='MATH5',Science='Science5')
raw=[]
for name,assessment in subjects.items():
    with (analysis/(name+'.csv')).open(encoding='utf-8-sig',newline='') as f:
        for row in csv.DictReader(f):
            beds,inst=row['ENTITY_CD'].strip(),row['INSTITUTION_ID'].strip()
            if not NUMBER.fullmatch(beds) or beds[:2] not in BOROUGHS or beds[8:]=='0000': continue
            assert NUMBER.fullmatch(inst) and row['ASSESSMENT_NAME']==assessment and row['SUBGROUP_NAME']=='All Students'
            id_beds[inst].add(beds);beds_ids[beds].add(inst)
            raw.append((name,row))

outcomes={}
seen=set()
unmatched=Counter()
for name,row in raw:
    if row['ESTIMATE_FLAG'].strip().upper()=='Y': continue
    dbn,reason=resolve(row,directory,roster,id_beds,beds_ids,dbn_beds)
    if not dbn:
        unmatched[(name,reason)]+=1;continue
    eligible,tested,proficient,published,status=measures(row)
    key=dbn,name,int(row['YEAR'])
    assert key not in seen
    seen.add(key)
    if status=='count': outcomes[key]=(proficient,tested)

# This science extract must agree with the independently verified production audit.
prior_import=json.loads(Path('.wrangler/nysed-assessments/production-assessment-results.json').read_text())
reference={(r['dbn'],'Science',r['spring_year']):(r['proficient'],r['tested']) for r in prior_import
           if r['assessment']=='Science5' and r['result_status']=='count'}
assert sum(k in reference for k in outcomes if k[1]=='Science')>1500
assert all(v==reference[k] for k,v in outcomes.items() if k in reference)

database=sqlite3.connect(':memory:')
database.executescript(Path('migrations-d1/0017_citywide_class_sizes.sql').read_text())
for name in ('releases','sections'):
    database.executescript(Path(f'dist/class-size-citywide/{name}.sql').read_text())

def classroom(release):
    data=defaultdict(dict)
    query="""SELECT scope_id,program,students,classes FROM city_class_size_sections
      WHERE scope='school' AND release_id=? AND band='K5' AND group_name='5'"""
    for dbn,p,n,c in database.execute(query,(release,)):
        # Geographic NYCPS district schools only. Keep the source's precise programs.
        if dbn not in roster or not 1<=int(dbn[:2])<=32 or roster[dbn]['district']!=int(dbn[:2]): continue
        assert p not in data[dbn]
        data[dbn][p]=(n,c)
    return data

october=classroom('february-2025-26')
unrevised=classroom('november-2025-26')

def aggregate(programs,scope):
    keys=programs.keys() if scope=='all' else {'Gen Ed'} if scope=='gen' else {'Gen Ed','ICT'}
    picked=[programs[k] for k in keys if k in programs]
    return tuple(map(sum,zip(*picked))) if picked else (0,0)

def number(x): return isinstance(x,(int,float)) and math.isfinite(x) and 0<=x<=100
def load_data(source=october,scope='main',threshold=20,complete=True,two_sections=False,only_public_baseline=True):
    result=[]
    for dbn,progs in sorted(source.items()):
        n,c=aggregate(progs,scope)
        if not c or (two_sections and c<2) or (only_public_baseline and not aggregate(october.get(dbn,{}),'main')[1]):continue
        out={y:{s:outcomes.get((dbn,s,y)) for s in subjects} for y in (2025,2026)}
        if not all(v and v[1]>=threshold for y,d in out.items() if complete or y==2026 for v in d.values()): continue
        result.append(dict(dbn=dbn,district=int(dbn[:2]),x=n/c,classes=c,n=n,ict=progs.get('ICT',(0,0))[0]/n if scope!='gen' else 0,
          eni=roster[dbn].get('economic_need_index'),ell=roster[dbn].get('ell_percent'),iep=roster[dbn].get('iep_percent'),out=out))
    return result

def rate(e,s,y=2026):
    a,b=e['out'][y][s];return 100*a/b

def fit(rows,s,y=2026,controls=(),weighted=False,bands=False):
    # School is the unit. District clustering allows residual dependence within districts.
    assert len({e['dbn'] for e in rows})==len(rows)
    n=len(rows)
    clusters=sorted({e['district'] for e in rows})
    X=[[1]+([int(e['x']<20),int(e['x']>=24)] if bands else [(e['x']-22)/5])+
       ([int(e['district']==d) for d in clusters[1:]] if 'district' in controls else [])+
       ([rate(e,s,2025)/100] if 'prior' in controls else [])+
       ([e['ict']] if 'ict' in controls and any(z['ict'] for z in rows) else [])+
       ([e[f]/100 for f in ('eni','ell','iep')] if 'demographic' in controls else []) for e in rows]
    X=np.asarray(X);Y=np.array([rate(e,s,y) for e in rows]);w=np.array([e['out'][y][s][1] if weighted else 1 for e in rows]);w=w/w.mean()
    Xw=X*np.sqrt(w)[:,None];Yw=Y*np.sqrt(w)
    b,_,rank,_=np.linalg.lstsq(Xw,Yw,rcond=None)
    K=rank
    residual=Yw-Xw@b
    bread=np.linalg.pinv(Xw.T@Xw)
    sandwich=np.zeros((X.shape[1],X.shape[1]))
    for d in clusters:
        mask=np.array([e['district']==d for e in rows]);score=Xw[mask].T@residual[mask];sandwich+=np.outer(score,score)
    G=len(clusters)
    cov=bread@sandwich@bread*(G/(G-1))*((n-1)/(n-K))
    z=1.959963984540054;df=G-1;t=z+(z**3+z)/(4*df)+(5*z**5+16*z**3+3*z)/(96*df**2)
    def unpack(j):
        margin=t*math.sqrt(max(0,cov[j,j]));return [round(x,2) for x in (b[j],b[j]-margin,b[j]+margin)]
    return [unpack(1),unpack(2)] if bands else unpack(1)

def means(rows):
    return {s:round(float(np.mean([rate(e,s) for e in rows])),2) for s in subjects}

def groups(rows):
    specs=[('under20',lambda x:x<20),('20to24',lambda x:20<=x<24),('24andup',lambda x:x>=24)]
    return {name:{'N':len(chosen),'mean_size':round(float(np.mean([e['x'] for e in chosen])),2),'rates':means(chosen),
      'pooled_rates':{s:round(100*sum(e['out'][2026][s][0] for e in chosen)/sum(e['out'][2026][s][1] for e in chosen),2) for s in subjects}}
      for name,p in specs if (chosen:=[e for e in rows if p(e['x'])])}

eligible=[dbn for dbn,p in october.items() if aggregate(p,'main')[1]]
current_all=load_data(threshold=1,complete=False)
common=load_data()
demo=[e for e in common if all(number(e[f]) for f in ('eni','ell','iep'))]
print('Intake:',len(october),len(eligible),len(current_all),len(common),len(demo),file=sys.stderr)
assert len(common)>=100 and len(eligible)>=len(common)
# Independent two-pass checks of the lead band averages and unadjusted slopes.
for compare,headline in ((lambda x:x<20,38.3),(lambda x:x>=24,47.1)):
    selected=[100*r['out'][2026]['Science'][0]/r['out'][2026]['Science'][1] for r in common if compare(r['x'])]
    assert round(math.fsum(selected)/len(selected),1)==headline
for subject in subjects:
    x=[r['x'] for r in common]
    xbar=math.fsum(x)/len(x)
    for year in (2025,2026):
        y=[rate(r,subject,year) for r in common]
        ybar=math.fsum(y)/len(y)
        independent=5*math.fsum((a-xbar)*(b-ybar) for a,b in zip(x,y))/math.fsum((a-xbar)**2 for a in x)
        assert round(independent,2)==fit(common,subject,y=year)[0]
controls=('district','prior','ict')
sets={'primary':common,'sample_demographics':demo,'tested_1':load_data(threshold=1),'tested_10':load_data(threshold=10),'tested_30':load_data(threshold=30),
  'two_sections':load_data(two_sections=True),'gen_only':load_data(scope='gen'),
  'all_programs':load_data(scope='all'),'first_october_version':load_data(source=unrevised)}

summary=dict(eligible=len(eligible),by_subject={s:sum((d,s,2026) in outcomes for d in eligible) for s in subjects},
  all_exact_spring2026=len(current_all),common=len(common),districts=len({e['district'] for e in common}),
  boroughs=dict(Counter(e['dbn'][2] for e in common)),x_percentiles=list(map(float,np.quantile([e['x'] for e in common],[0,.1,.25,.5,.75,.9,1]))),
  band_stats=groups(common),matched_dropped_size={k:round(float(np.mean([aggregate(october[d],'main')[0]/aggregate(october[d],'main')[1]
    for d in g])),2) for k,g in [('matched',[e['dbn'] for e in common]),('excluded',sorted(set(eligible)-{e['dbn'] for e in common}))]},
  outcomes={s:{'raw':fit(common,s),'before_exposure':fit(common,s,y=2025),
      'within_district':fit(common,s,controls=('district',)),
      'district_prior':fit(common,s,controls=('district','prior')),
      'adjusted':fit(common,s,controls=controls),'weighted':fit(common,s,controls=controls,weighted=True),
      'demographics_same_sample':fit(demo,s,controls=controls),
      'with_demographics':fit(demo,s,controls=(*controls,'demographic')),
      'adjusted_size_bands':fit(common,s,controls=controls,bands=True),
      'without_one_borough':{b:fit([e for e in common if e['dbn'][2]!=b],s,controls=controls)[0] for b in 'MXKQR'}}
      for s in subjects},sensitivity={name:{'N':len(part),'slopes':{s:fit(part,s,controls=controls) for s in subjects}}
       for name,part in sets.items() if part})
print(json.dumps(summary,indent=2))
