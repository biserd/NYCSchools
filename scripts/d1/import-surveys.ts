import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {matchSurveyIdentity} from '../../shared/survey-matching';
import type {SurveyInstrument} from '../../shared/surveys';
const database='nyc-schools-ratings-d1-staging',databaseId='e48a9ae9-4948-4dae-863a-06f6b026b436';
const expected=process.argv[process.argv.indexOf('--expected-database')+1];
if(!process.argv.includes('--expected-database')||expected!==databaseId)throw new Error(`Explicit --expected-database ${databaseId} is required. This importer only targets D1 staging.`);
const input=process.argv[2];if(!input)throw new Error('Survey JSON export required');
type Release={id:string;instrument:SurveyInstrument;sourceUrl:string;hash:string;rows:{sourceId:string;sourceName:string;responseCount:number|null;responseRate:number|null;metrics:unknown[]}[]};
const releases=JSON.parse(await readFile(input,'utf8')) as Release[];
async function wrangler(args:string[]){return new Promise<string>((resolve,reject)=>{const p=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config','wrangler.d1-staging.jsonc'],{windowsHide:true});let stdout='',stderr='';p.stdout.on('data',c=>stdout+=c);p.stderr.on('data',c=>stderr+=c);p.on('error',reject);p.on('close',code=>code===0?resolve(stdout):reject(new Error(stderr||stdout)));});}
const previous=JSON.parse(await wrangler(['d1','execute',database,'--remote','--command','SELECT id,source_hash FROM school_survey_releases','--json']))[0].results as {id:string;source_hash:string}[];
const base='https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
async function get(path:string){const r=await fetch(base+path);if(!r.ok)throw Error(`${path}: ${r.status}`);return r.json();}
const schools=new Set<string>((await get('/api/schools')).map((s:{dbn:string})=>s.dbn));
const centers=await get('/api/nyceec-centers');
const literal=(v:unknown):string=>v==null?'NULL':typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;
const statements:string[]=[];
for(const release of releases){
 if(!['k12-family','k12-teacher','k12-student','b5-family','b5-teacher'].includes(release.instrument)||release.id!==`2026-${release.instrument}`||!/^[a-f0-9]{64}$/.test(release.hash)||!release.sourceUrl.startsWith('https://infohub.nyced.org/'))throw new Error('Invalid source release');
 const old=previous.find(r=>r.id===release.id);if(old){if(old.source_hash!==release.hash)throw new Error(`Source changed: ${release.id}; review revision before replacing`);console.log(`${release.id}: unchanged`);continue;}
 statements.push(`INSERT INTO school_survey_releases(id,year,instrument,source_url,source_hash) VALUES(${[release.id,2026,release.instrument,release.sourceUrl,release.hash].map(literal)});`);
 const seen=new Set<string>();
 for(const row of release.rows){
  if(seen.has(row.sourceId))throw new Error(`Duplicate ${row.sourceId}`);seen.add(row.sourceId);
  const identity=matchSurveyIdentity(row.sourceId,release.instrument,schools,centers);
  const statement=`INSERT INTO school_survey_results(release_id,source_id,source_name,school_dbn,center_id,response_count,response_rate,metrics,match_method) VALUES(${[release.id,row.sourceId,row.sourceName,identity.schoolDbn,identity.centerId,row.responseCount,row.responseRate,JSON.stringify(row.metrics),identity.method].map(literal)});`;
  if(Buffer.byteLength(statement)>95000)throw new Error('Survey row exceeds SQL import statement budget');statements.push(statement);
 }
}
if(!statements.length){console.log('All five releases already present; no writes.');process.exit(0);}
await mkdir('.wrangler',{recursive:true});await writeFile('.wrangler/d1-survey-import.sql',statements.join('\n'));
console.log(`Validated ${statements.length} D1 statements. Existing school and center records are not changed.`);
if(process.argv.includes('--apply'))console.log(await wrangler(['d1','execute',database,'--remote','--file','.wrangler/d1-survey-import.sql','--yes']));
else console.log('Dry run only; add --apply after reviewing the generated SQL.');
