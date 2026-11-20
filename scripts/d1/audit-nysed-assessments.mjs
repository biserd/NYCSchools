/** Read-only checks against one explicitly pinned staging database. */
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const root='.wrangler/nysed-assessments';
const config='wrangler.d1-staging.jsonc';
const database='nyc-schools-ratings-d1-staging';
const databaseId='e48a9ae9-4948-4dae-863a-06f6b026b436';
const mode=process.argv[2];
assert.ok(['--before','--after'].includes(mode),'Use --before or --after');
const configuration=await readFile(config,'utf8');
assert.ok(configuration.includes(`"database_name":"${database}","database_id":"${databaseId}"`),
  'Refusing to query: the staging binding no longer matches');
await mkdir(root,{recursive:true});

async function query(sql){
  assert.match(sql,/^(SELECT|PRAGMA table_info\()/i);
  const json=await new Promise((resolveResult,reject)=>{
    const p=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',database,'--remote',
      '--config',config,'--json','--command',sql],{windowsHide:true,
      env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve(root,'d1-audit.log')}});
    let out='',err=''; p.stdout.setEncoding('utf8');p.stderr.setEncoding('utf8');
    p.stdout.on('data',chunk=>out+=chunk);p.stderr.on('data',chunk=>err+=chunk);
    p.once('error',reject);p.once('close',code=>code===0?resolveResult(out):reject(Error(err||out)));
  });
  const [body]=JSON.parse(json);
  assert.ok(body.success&&!body.meta?.changed_db,'Expected a successful read-only result');
  return body.results;
}

async function fingerprint(table,key){
  const names=(await query(`PRAGMA table_info(${table})`)).map(col=>col.name);
  assert.ok(names.includes(key)&&names.every(name=>/^\w+$/.test(name)));
  const colList=names.map(name=>`"${name}"`).join(',');
  const hash=createHash('sha256').update(JSON.stringify(names)+'\n');
  let last=key==='dbn'?null:0,count=0;
  while(true){
    const remainder=last===null?'':`WHERE ${key} > ${typeof last==='number'?last:`'${last.replaceAll("'","''")}'`}`;
    const rows=await query(`SELECT ${key} AS cursor,json_array(${colList}) AS row_data FROM ${table} ${remainder} ORDER BY ${key} LIMIT 8000`);
    for(const row of rows) hash.update(row.row_data+'\n');
    count+=rows.length;
    if(rows.length<8000) break;
    last=rows.at(-1).cursor;
  }
  const result={table,rows:count,sha256:hash.digest('hex')};
  console.log(`${table}: ${count} read-only rows fingerprinted`);
  return result;
}

const records=await Promise.all([
  fingerprint('schools','dbn'),fingerprint('school_historical_scores','id'),fingerprint('hs_regents','id'),
]);
const priorFile=root+'/staging-before.json';
if(mode==='--before'){
  await writeFile(priorFile,JSON.stringify({database:databaseId,records},null,2)+'\n',{flag:'wx'});
}else{
  const prior=JSON.parse(await readFile(priorFile,'utf8'));
  assert.equal(prior.database,databaseId);
  assert.deepEqual(records,prior.records,'Legacy schools, history or Regents changed');
  const coverage=JSON.parse(await readFile(root+'/combined/coverage.json','utf8'));
  const releaseId=coverage.release_id;
  assert.match(releaseId,/^nysed-src2026-[a-f0-9]{16}$/);
  const sources=await query(`SELECT * FROM school_assessment_archive_releases WHERE id='${releaseId}'`);
  assert.deepEqual(sources.map(r=>[r.id,r.source_url,r.released_on,r.archive_sha256,r.dictionary_sha256]),
    [[releaseId,coverage.source_url,coverage.release_date,coverage.archive_sha256,coverage.dictionary_sha256]]);
  const fields=['release_id','dbn','spring_year','subject','assessment','grade','population','definition','institution_id',
    'beds_code','directory_sha256','eligible','tested','proficient','published_percent','result_status'];
  const data=await query(`SELECT ${fields.join(',')} FROM school_assessment_archive_results WHERE release_id='${releaseId}'`);
  const actual=data.map(row=>JSON.stringify(fields.map(field=>row[field]))).sort();
  const expected=JSON.parse(await readFile(root+'/combined/expected-results.json','utf8')).map(row=>JSON.stringify(row)).sort();
  assert.deepEqual(actual,expected,'Imported rows differ from the validated extract');
  const districtFields=['release_id','district','spring_year','assessment','population','definition','institution_id','beds_code',
    'eligible','tested','proficient'];
  const districts=await query(`SELECT ${districtFields.join(',')} FROM school_assessment_archive_district_science WHERE release_id='${releaseId}'`);
  assert.deepEqual(districts.map(row=>JSON.stringify(districtFields.map(field=>row[field]))).sort(),
    JSON.parse(await readFile(root+'/combined/expected-district-science.json','utf8')).map(row=>JSON.stringify(row)).sort(),
    'District science results differ from the validated official aggregates');
  await writeFile(root+'/staging-assessment-results.json',JSON.stringify(data));
  await writeFile(root+'/staging-district-science.json',JSON.stringify(districts));
  await writeFile(root+'/staging-after.json',JSON.stringify({database:databaseId,records,releaseId,verifiedAssessmentRows:data.length},null,2)+'\n');
  console.log(`Verified every value of ${data.length} assessment rows and ${districts.length} district science results; legacy fingerprints unchanged.`);
}
