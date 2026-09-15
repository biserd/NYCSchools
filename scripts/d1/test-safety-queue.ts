import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getPlatformProxy} from 'wrangler';
import {createDatabase,withDatabaseInstance} from '../../server/db';
import {startSafetyRefresh,consumeSafetyRefresh} from '../../server/services/safetyQueue';

const path=await mkdtemp(join(tmpdir(),'nyc-d1-safety-test-'));
const platform=await getPlatformProxy<Env>({configPath:'wrangler.d1-test.jsonc',persist:{path}});
const messages:unknown[]=[];
const sent:string[]=[];
const queue={send:async(body:unknown)=>{messages.push(body);sent.push(JSON.stringify(body));}};
const env={...platform.env,SAFETY_QUEUE:queue} as Env;
const originalFetch=globalThis.fetch;
let failNext=true,requests=0;
const current=new Date();current.setMonth(current.getMonth()-1);
const prior=new Date();prior.setMonth(prior.getMonth()-18);
const fixtures=[{cmplnt_num:'synthetic-current',cmplnt_fr_dt:current.toISOString(),law_cat_cd:'FELONY',ofns_desc:'ROBBERY',latitude:'40.7',longitude:'-74.0'},
{cmplnt_num:'synthetic-prior',cmplnt_fr_dt:prior.toISOString(),law_cat_cd:'MISDEMEANOR',ofns_desc:'PETIT LARCENY',latitude:'40.7',longitude:'-74.0'}];
globalThis.fetch=async(input,init)=>{
 if(String(input).startsWith('https://data.cityofnewyork.us/')){
  requests++;if(failNext){failNext=false;return new Response('simulated source failure',{status:503});}
  const url=new URL(String(input)),where=url.searchParams.get('$where')!;
  const bounds=[...where.matchAll(/'([^']+)'/g)].map(match=>Date.parse(match[1]+'Z'));
  assert.equal(bounds.length,2);assert.ok(bounds[1]-bounds[0]<=32*86400000,'Source query must be month-bounded');
  assert.equal(url.searchParams.get('$order'),'cmplnt_fr_dt,cmplnt_num');
  return Response.json(fixtures.filter(row=>Date.parse(row.cmplnt_fr_dt)>=bounds[0]&&Date.parse(row.cmplnt_fr_dt)<bounds[1]));
 }
 return originalFetch(input,init);
};
try{
 for(const file of (await readdir('migrations-d1')).filter(file=>file.endsWith('.sql')).sort()){
  const sql=await readFile(`migrations-d1/${file}`,'utf8');
  for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await env.DB.prepare(statement).run();
 }
 for(let i=0;i<21;i++)await env.DB.prepare("INSERT INTO schools(dbn,name,district,address,grade_band,latitude,longitude) VALUES(?,'Synthetic school',1,'Synthetic','K-5',40.7,-74)").bind(`99T${String(i).padStart(3,'0')}`).run();
 await env.DB.prepare("INSERT INTO school_safety_index(school_type,school_key,radius_meters,period_start,period_end,safety_index) VALUES('public','99T000',402,1,2,77)").run();
 await withDatabaseInstance(createDatabase(env.DB),async()=>{
  await startSafetyRefresh(env);
  const first=messages.shift();let acked=false;
  const delivery=(body:unknown)=>({messages:[{body,ack(){acked=true;}}]}) as MessageBatch<unknown>;
  await assert.rejects(()=>consumeSafetyRefresh(delivery(first),env),/Socrata page failed/);
  assert.equal(acked,false);const failedState=JSON.parse((await env.DB.prepare("SELECT value FROM app_settings WHERE key='d1_safety_refresh_job'").first<string>('value'))!);assert.equal(failedState.offset,0);
  messages.unshift(first);
  let sawPending=false;
  let runs=0;while(messages.length){assert.ok(runs++<100,'Queue loop did not terminate');await consumeSafetyRefresh(delivery(messages.shift()),env);
   const pending=await env.DB.prepare('SELECT count(*) n FROM school_safety_recompute_rows').first<number>('n');
   if(pending===80){sawPending=true;assert.equal(await env.DB.prepare('SELECT count(*) n FROM school_safety_index').first('n'),1);assert.equal(await env.DB.prepare('SELECT safety_index FROM school_safety_index').first('safety_index'),77,'Published score changed before completion');}
  }
  assert.ok(sawPending,'Did not exercise incremental computation');
  const state=JSON.parse((await env.DB.prepare("SELECT value FROM app_settings WHERE key='d1_safety_refresh_job'").first<string>('value'))!);assert.equal(state.phase,'complete');
  assert.equal(await env.DB.prepare('SELECT count(*) n FROM nypd_complaints').first('n'),2);
  const results=(await env.DB.prepare('SELECT total_reports,felony_reports,violent_felony_reports,prior_period_total,safety_index FROM school_safety_index').all()).results;
  assert.equal(results.length,84);for(const row of results){assert.equal(row.total_reports,1);assert.equal(row.felony_reports,1);assert.equal(row.violent_felony_reports,1);assert.equal(row.prior_period_total,1);assert.equal(row.safety_index,100);}
  await consumeSafetyRefresh(delivery(first),env);assert.equal(messages.length,0,'Completed-job duplicate requeued');
  const finalizedBefore=await env.DB.prepare("SELECT value FROM app_settings WHERE key='safety_recompute_run_state'").first('value');
  await env.DB.prepare("UPDATE app_settings SET value=? WHERE key='d1_safety_refresh_job'").bind(JSON.stringify({...state,phase:'compute'})).run();
  await consumeSafetyRefresh(delivery(first),env);
  assert.equal(await env.DB.prepare("SELECT value FROM app_settings WHERE key='safety_recompute_run_state'").first('value'),finalizedBefore,'Finalized retry restarted recomputation');
  assert.equal(messages.length,0);
  const report={passed:['source failure retries without advancing checkpoint','month-bounded deterministic source pagination','two-dataset complaint deduplication','queued phase transitions','all four safety radii','current/prior date boundaries','violent felony classification','percentile finalization','completed-job duplicate ignored','retry after finalization does not restart computation'],requests,queueMessages:sent.length};
  await writeFile('.wrangler/d1-safety-queue-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 });
}finally{globalThis.fetch=originalFetch;await platform.dispose();}
