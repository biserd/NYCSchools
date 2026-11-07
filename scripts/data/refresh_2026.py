"""Prepare and rehearse a bounded, append-only historical refresh. No remote writes."""
from pathlib import Path
import json,hashlib,math,sqlite3,re,datetime
from nyc_xlsx import workbook,rows
from nyc_import_values import number,demographic_percent,exam
import gzip
from types import SimpleNamespace
REPO=Path(__file__).resolve().parents[2]
SOURCE=REPO.parent/'marketing-audit-nov7/education-releases'
OUT=REPO/'.wrangler/2026-refresh';OUT.mkdir(parents=True,exist_ok=True)
BEFORE=OUT/'prod-before'
old={t:json.loads((BEFORE/(t+'.json')).read_text(encoding='utf-8')) for t in ['schools','school_historical_scores','hs_regents','enrollment_data']}
schools={s['dbn']:s for s in old['schools']}
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
base='https://infohub.nyced.org/docs/default-source/default-document-library/'
report={'prepared':now,'sourceFiles':[],'unmatched':{},'notes':['2026 NYCPS ELA/math exclude charter schools and District 75; retain older dated results for schools absent from the release.','2026 results are the NYCPS file snapshot as of August 3, 2026, not a claim of finalized NYSED data.','No inferred participation denominators. No science refresh: retain its separate prior assessment year.','Older historical values are retained unchanged. New Regents reporting years 2024–2026 are appended.']}
sql=[];rollback=[]
def lit(v):
 if v is None:return 'NULL'
 if isinstance(v,(int,float)):return str(v)
 return "'"+str(v).replace("'","''")+"'"
def source(name,sheet):
 p=SOURCE/name;h=hashlib.sha256(p.read_bytes()).hexdigest()
 cache=OUT/'source-cache'/(h[:16]+'-'+re.sub(r'[^a-zA-Z0-9]','_',sheet)+'.jsonl.gz')
 if cache.exists():
  def cached():
   with gzip.open(cache,'rt',encoding='utf-8') as f:
    for line in f:yield json.loads(line)
  return SimpleNamespace(close=lambda:None),cached(),h
 z,ss,sheets=workbook(p);it=rows(z,ss,sheets[sheet]);header=next(it)
 cache.parent.mkdir(exist_ok=True);partial=cache.with_suffix('.partial')
 def records():
  n=0
  with gzip.open(partial,'wt',encoding='utf-8') as f:
   for raw in it:
    r={v:raw.get(k,'') for k,v in header.items()}
    if name.startswith('school-') and r.get('Year')!='2026':continue
    if name.startswith('nyc-regents') and r.get('Year') not in ['2024','2025','2026']:continue
    f.write(json.dumps(r,separators=(',',':'))+'\n');n+=1
    yield r
  partial.replace(cache)
  print('Read '+sheet+': '+str(n)+' relevant source rows',flush=True)
 return z,records(),h
def release(kind,year,name,h,notes):
 rid=kind+'-'+year
 sql.append(f"INSERT OR IGNORE INTO school_data_releases VALUES({','.join(map(lit,[rid,kind,year,base+name,h,now,notes]))});")
 report['sourceFiles'].append({'id':rid,'url':base+name,'sha256':h,'notes':notes})
 rollback.append('DELETE FROM school_data_releases WHERE id='+lit(rid)+' AND source_hash='+lit(h)+';')
def insert_if_absent(table,record,keys):
 where=' AND '.join(k+'='+lit(record[k]) for k in keys)
 sql.append(f"INSERT INTO {table}({','.join(record)}) SELECT {','.join(lit(v) for v in record.values())} WHERE NOT EXISTS(SELECT 1 FROM {table} WHERE {where});")
 rollback.append(f'DELETE FROM {table} WHERE {where};')
def update_school(dbn,values):
 metadata={k:values.pop(k) for k in list(values) if k in ['demographics_year','demographics_source']}
 if metadata:
  sql.append('INSERT INTO school_profile_metadata(dbn,'+','.join(metadata)+') VALUES('+','.join(map(lit,[dbn,*metadata.values()]))+') ON CONFLICT(dbn) DO UPDATE SET '+','.join(k+'=excluded.'+k for k in metadata)+';')
  rollback.append('UPDATE school_profile_metadata SET demographics_year=NULL,demographics_source=NULL WHERE dbn='+lit(dbn)+';')
 sql.append('UPDATE schools SET '+','.join(k+'='+lit(v) for k,v in values.items())+' WHERE dbn='+lit(dbn)+';')
 rollback.append('UPDATE schools SET '+','.join(k+'='+lit(schools[dbn].get(k)) for k in values)+' WHERE dbn='+lit(dbn)+';')
# ELA/math: one source row per DBN/year/grade. Suppressed values remain null.
assess={};grades={};hashes={}
for subject,sheet in [('ela','ELA - All'),('math','Math - All')]:
 name=f'school-{subject}-results-public.xlsx';z,it,h=source(name,sheet);hashes[subject]=h
 seen=set();unmatched=set();n=0
 for r in it:
  if r.get('Year')!='2026' or r.get('Category')!='All Students':continue
  dbn=r['DBN'].strip().upper();g=r['Grade'];key=(dbn,g)
  if key in seen:raise ValueError('Duplicate assessment source '+str(key))
  seen.add(key)
  if dbn not in schools:unmatched.add(dbn);continue
  p=number(r.get('% Level 3+4'),True);tested=number(r.get('Number Tested'))
  if g=='All Grades':assess.setdefault(dbn,{})[subject]=(p,tested);n+=1
  elif g in ['3','4','5','6','7','8']:grades.setdefault(dbn,{})[subject+'_grade'+g]=p
 z.close();report[subject+'Schools']=n;report['unmatched'][subject]=sorted(unmatched)
 release(subject,'2026',name,h,'Spring 2026 tests / school year 2025–26. NYCPS snapshot as of August 3, 2026. Public district schools; no charter-school update.')
assert len(assess)>700,'Unexpected assessment coverage'
old_keys={(r['dbn'],r['year']) for r in old['school_historical_scores']}
for dbn,v in assess.items():
 ela,et=v.get('ela',(None,None));ma,mt=v.get('math',(None,None))
 record={'dbn':dbn,'year':2026,'ela_proficiency':ela,'math_proficiency':ma,'ela_tested_count':et,'math_tested_count':mt,'data_source':'NYCPS InfoHub: spring 2026 ELA/math; snapshot 2026-08-03','data_source_release':'NYCPS snapshot as of 2026-08-03; source hashes in school_data_releases'}
 if (dbn,2026) in old_keys:raise ValueError('2026 historical results already exist; compare source release before replacing')
 insert_if_absent('school_historical_scores',record,['dbn','year'])
 values={'ela_proficiency':ela,'math_proficiency':ma,'ela_tested_count':et,'math_tested_count':mt,'ela_eligible_count':None,'math_eligible_count':None,'ela_participation_rate':None,'math_participation_rate':None,'assessment_year':'2025-26','assessment_source':'NYCPS InfoHub · spring 2026 ELA/math · snapshot August 3, 2026','academics_score':math.floor((ela+ma)/2+.5) if ela is not None and ma is not None else None}
 values.update({s+'_grade'+str(g):grades.get(dbn,{}).get(s+'_grade'+str(g)) for s in ['ela','math'] for g in range(3,9)})
 update_school(dbn,values)
# Demographics: keep dated source history plus the undated legacy field values.
name='demographic-snapshot-2021-22-to-2025-26-public.xlsx';z,it,h=source(name,'School')
mapping={'ell_percent':'% English Language Learners','iep_percent':'% Students with Disabilities','asian_percent':'% Asian and Pacific Islander','black_percent':'% Black','hispanic_percent':'% Hispanic','white_percent':'% White','multi_racial_percent':'% Multi-Racial','economic_need_index':'Economic Need Index'}
grade_columns={'3K':'Grade 3K','PK':'Grade PK (Half Day & Full Day)','K':'Grade K',**{str(g):'Grade '+str(g) for g in range(1,13)}}
seen=set();unmatched=set();demographic_count=0;year_counts={};enrollment_count=0
fields=['enrollment','elementary_enrollment','middle_enrollment','high_school_enrollment',*mapping]
for r in it:
 dbn=r.get('DBN','').strip().upper();year=r.get('Year','');key=(dbn,year)
 if not re.fullmatch(r'20\d{2}-\d{2}',year):continue
 if key in seen:raise ValueError('Duplicate demographics source '+str(key))
 seen.add(key)
 if dbn not in schools:unmatched.add(dbn);continue
 data={'enrollment':number(r.get('Total Enrollment'))}
 grade_data={g:number(r.get(col)) for g,col in grade_columns.items()}
 for field,gg in [('elementary_enrollment',['K','1','2','3','4','5']),('middle_enrollment',['6','7','8']),('high_school_enrollment',['9','10','11','12'])]:
  data[field]=sum(grade_data[g] for g in gg) if all(grade_data[g] is not None for g in gg) else None
 for field,col in mapping.items():
  data[field]=demographic_percent(r.get(col))
 bounds={field:r.get(col) for field,col in mapping.items() if str(r.get(col,'')).lower().replace('%','') in ['above 95','below 5']}
 if bounds:data['reported_bounds']=bounds
 if data['enrollment'] is not None and all(v is not None for v in grade_data.values()):
  if abs(sum(grade_data.values())-data['enrollment'])>0:raise ValueError('Grade enrollment total mismatch '+str(key))
 insert_if_absent('school_demographics_history',{'dbn':dbn,'school_year':year,'data':json.dumps(data,separators=(',',':')),'source_url':base+name,'source_hash':h},['dbn','school_year'])
 year_counts[year]=year_counts.get(year,0)+1
 if year=='2025-26':
  legacy={f:schools[dbn].get(f) for f in fields}
  insert_if_absent('school_demographics_history',{'dbn':dbn,'school_year':'legacy-undated','data':json.dumps(legacy,separators=(',',':')),'source_url':'Legacy school profile fields; reporting year not recorded','source_hash':None},['dbn','school_year'])
  update_school(dbn,{**{f:data[f] for f in fields},'demographics_year':'2025-26','demographics_source':'NYCPS Demographic Snapshot 2021–22 to 2025–26'})
  demographic_count+=1
  for g,v in grade_data.items():
   record={'dbn':dbn,'school_year':'2025-2026','grade':g,'enrolled':v,'is_suppressed':int(v is None),'source_file':base+name}
   insert_if_absent('enrollment_data',record,['dbn','school_year','grade']);enrollment_count+=1
z.close();assert demographic_count>1200,'Unexpected demographics coverage'
report.update({'demographicsSchools':demographic_count,'demographicHistoryByYear':year_counts,'enrollmentRowsAdded':enrollment_count});report['unmatched']['demographics']=sorted(unmatched)
release('demographics','2025-26',name,h,'Five source school years retained separately. Fractions scaled to percentages. Current profile fields use 2025–26; legacy values retained without an invented year.')
# Regents: append reporting years 2024–2026, preserving all older rows and exam distinctions.
name='nyc-regents-overall-and-by-category---public.xlsx';z,it,h=source(name,'All Students');regents={};unmatched=set();reg_years={}
for r in it:
 year=number(r.get('Year'));dbn=r.get('School DBN','').strip().upper()
 if year not in [2024,2025,2026] or r.get('Category')!='All Students':continue
 if dbn not in schools:unmatched.add(dbn);continue
 e=exam(r['Regents Exam']);key=(dbn,year,e)
 if key in regents:raise ValueError('Duplicate Regents exam '+str(key))
 regents[key]={'dbn':dbn,'year':year,'exam_name':e,'total_tested':number(r.get('Total Tested')),'pass_rate':number(r.get('Percent Scoring 65 or Above'),True),'mean_score':number(r.get('Mean Score'),True),'college_ready_rate':number(r.get('Percent Scoring 80 or Above'),True),'data_source':'NYCPS InfoHub · Regents reporting year '+str(year)+' · highest score per student/exam across administrations; 80+ is a score threshold, not the CUNY readiness benchmark'}
 reg_years[year]=reg_years.get(year,0)+1
z.close()
category_map={'male':'pass_rate_male','female':'pass_rate_female','asian':'pass_rate_asian','black':'pass_rate_black','hispanic':'pass_rate_hispanic','white':'pass_rate_white','ell':'pass_rate_ell','swd':'pass_rate_swd'}
categories={}
for sheet in ['By Gender','By Ethnicity','By ELL Status','By SWD Status']:
 z,it,_=source(name,sheet);cats=set()
 for r in it:
  year=number(r.get('Year'))
  if year not in [2024,2025,2026]:continue
  cat=r.get('Category','').strip();cats.add(cat)
  field=category_map.get(cat.lower());key=(r.get('School DBN','').strip().upper(),year,exam(r.get('Regents Exam','')))
  if field and key in regents:regents[key][field]=number(r.get('Percent Scoring 65 or Above'),True)
 z.close();categories[sheet]=sorted(cats)
assert reg_years.get(2026,0)>3000,'Unexpected Regents coverage'
old_reg={(r['dbn'],r['year'],r['exam_name']) for r in old['hs_regents']}
for key,record in regents.items():
 if key in old_reg:raise ValueError('New Regents year already exists; review before replacing')
 insert_if_absent('hs_regents',record,['dbn','year','exam_name'])
release('regents','2026',name,h,'Append reporting years 2024–2026. Legacy rows preserved. Source Year displayed as reporting year; no inferred start-year range. Biology/new science exams not merged into predecessor exams.')
report.update({'regentsRowsByYear':reg_years,'regentsCategories':categories});report['unmatched']['regents']=sorted(unmatched)
# Guard release/state by rehearsing the exact SQL on the complete public-data backup.
body='\n'.join(sql)+'\n';(OUT/'import.sql').write_text(body,encoding='utf-8');(OUT/'rollback.sql').write_text('\n'.join(reversed(rollback))+'\n',encoding='utf-8')
db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
for migration in sorted((REPO/'migrations-d1').glob('*.sql')):
 if migration.name<'0012':db.executescript(migration.read_text(encoding='utf-8'))
for table,records in old.items():
 for r in records:db.execute('INSERT INTO '+table+'('+','.join(r)+') VALUES('+','.join('?' for _ in r)+')',list(r.values()))
db.commit();db.executescript((REPO/'migrations-d1/0012_school_data_refresh.sql').read_text(encoding='utf-8'))
db.executescript(body)
def checksum(table):return hashlib.sha256(json.dumps([dict(r) for r in db.execute('SELECT * FROM '+table+' ORDER BY 1,2')],sort_keys=True).encode()).hexdigest()
checks={}
for t in ['school_historical_scores','hs_regents','enrollment_data']:
 original={r['id']:r for r in old[t]}
 preserved=[dict(r) for r in db.execute('SELECT * FROM '+t) if r['id'] in original]
 assert all(r==original[r['id']] for r in preserved) and len(preserved)==len(original),'Old rows changed '+t
 checks[t+'_oldRowsUnchanged']=len(preserved)
before={t:checksum(t) for t in ['schools','school_historical_scores','hs_regents','enrollment_data','school_demographics_history','school_profile_metadata']}
db.executescript(body);assert before=={t:checksum(t) for t in before},'Import is not idempotent'
assert db.execute('SELECT COUNT(*) FROM school_historical_scores WHERE year=2026').fetchone()[0]==len(assess)
assert not list(db.execute('PRAGMA foreign_key_check'))
expected={t:[dict(r) for r in db.execute('SELECT * FROM '+t)] for t in before}
(OUT/'expected.json').write_text(json.dumps(expected,separators=(',',':')),encoding='utf-8')
with sqlite3.connect(OUT/'expected.sqlite') as target:db.backup(target)
checks['idempotent']=True;checks['foreignKeysValid']=True;checks['assessment2026Schools']=len(assess)
report['checks']=checks;report['sqlStatements']=len(sql);report['sqlBytes']=len(body.encode())
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceFiles','unmatched']},indent=2))
for k,v in report['unmatched'].items():print(k+': '+str(len(v))+' unmatched DBNs retained in report, not guessed')

