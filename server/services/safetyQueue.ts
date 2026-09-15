import { withDatabaseConnection } from '../db';
import { parseComplaintRow, recomputeSafetyIndex } from './safetyIndex';
import type { NypdComplaintRow } from './socrataClient';

const STATE_KEY='d1_safety_refresh_job';
const datasets=['5uac-w243','qgea-i56i'];
const PAGE_SIZE=3000;
type State={id:string;phase:'pull'|'compute'|'complete';dataset:number;offset:number;cutoff:string;received:number;startedAt:string;updatedAt:string};
async function read(env:Env):Promise<State|null>{
  const value=await env.DB.prepare('SELECT value FROM app_settings WHERE key=?').bind(STATE_KEY).first<string>('value');
  return value?JSON.parse(value) as State:null;
}
async function save(env:Env,state:State){
  state.updatedAt=new Date().toISOString();
  await env.DB.prepare('INSERT INTO app_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(STATE_KEY,JSON.stringify(state),Date.now()).run();
}
export async function startSafetyRefresh(env:Env){
  const existing=await read(env);
  if(existing&&existing.phase!=='complete'){
    await env.SAFETY_QUEUE.send({kind:'safety-refresh',id:existing.id});
    return {id:existing.id,resumed:true};
  }
  const cutoff=new Date();cutoff.setMonth(cutoff.getMonth()-24);
  const state:State={id:crypto.randomUUID(),phase:'pull',dataset:0,offset:0,cutoff:cutoff.toISOString(),received:0,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await save(env,state);await env.SAFETY_QUEUE.send({kind:'safety-refresh',id:state.id});return {id:state.id,resumed:false};
}
export async function consumeSafetyRefresh(batch:MessageBatch<unknown>,env:Env){
  for(const message of batch.messages){
    const body=message.body;
    if(!body||typeof body!=='object'||!('kind' in body)||body.kind!=='safety-refresh'||!('id' in body)||typeof body.id!=='string'){message.ack();continue;}
    const state=await read(env);
    if(!state||state.id!==body.id||state.phase==='complete'){message.ack();continue;}
    if(state.phase==='pull'){
      const url=new URL(`https://data.cityofnewyork.us/resource/${datasets[state.dataset]}.json`);
      url.searchParams.set('$select','cmplnt_num,cmplnt_fr_dt,law_cat_cd,ofns_desc,pd_desc,boro_nm,latitude,longitude');
      url.searchParams.set('$where',`cmplnt_fr_dt >= '${state.cutoff.slice(0,19)}' AND latitude IS NOT NULL AND longitude IS NOT NULL`);
      url.searchParams.set('$order',':id');url.searchParams.set('$limit',String(PAGE_SIZE));url.searchParams.set('$offset',String(state.offset));
      const token: string|undefined=Reflect.get(env,'SOCRATA_APP_TOKEN');
      const response=await fetch(url,{headers:token?{'X-App-Token':token}:{},signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw new Error(`Socrata page failed (${response.status}); queue will retry without advancing the cursor`);
      const raw=await response.json() as NypdComplaintRow[];
      if(!Array.isArray(raw)||raw.length>PAGE_SIZE)throw new Error('Invalid Socrata page');
      const rows=raw.map(parseComplaintRow).filter(r=>r!==null);
      const statements:D1PreparedStatement[]=[];
      for(let i=0;i<rows.length;i+=12){
        const chunk=rows.slice(i,i+12);
        statements.push(env.DB.prepare(`INSERT INTO nypd_complaints(cmplnt_num,complaint_date,law_cat_cd,ofns_desc,pd_desc,borough,latitude,longitude) VALUES ${chunk.map(()=>'(?,?,?,?,?,?,?,?)').join(',')} ON CONFLICT(cmplnt_num) DO NOTHING`).bind(...chunk.flatMap(r=>[r.cmplntNum,r.complaintDate.getTime(),r.lawCatCd??null,r.ofnsDesc??null,r.pdDesc??null,r.borough??null,r.latitude,r.longitude])));
      }
      for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));
      state.received+=raw.length;state.offset+=raw.length;
      if(raw.length<PAGE_SIZE){state.dataset++;state.offset=0;}
      if(state.dataset>=datasets.length){
        await env.DB.prepare('DELETE FROM nypd_complaints WHERE complaint_date < ?').bind(Date.parse(state.cutoff)).run();state.phase='compute';
      }
    }else{
      // Finalization and the job checkpoint are separate writes. A retry after
      // finalization must not start another complete recomputation.
      const runValue=await env.DB.prepare('SELECT value FROM app_settings WHERE key=?').bind('safety_recompute_run_state').first<string>('value');
      const finalizedAt=runValue?(JSON.parse(runValue) as {finalizedAt?:string}).finalizedAt:undefined;
      if(finalizedAt&&Date.parse(finalizedAt)>=Date.parse(state.startedAt))state.phase='complete';
      else {
        const result=await withDatabaseConnection(()=>recomputeSafetyIndex());
        if(result.finalized)state.phase='complete';
      }
    }
    // One consumer at a time. Re-delivery re-reads this checkpoint, and imports
    // are idempotent. Save before enqueue; a failed enqueue retries this message.
    await save(env,state);
    if(state.phase!=='complete')await env.SAFETY_QUEUE.send({kind:'safety-refresh',id:state.id});
    message.ack();
    console.log(JSON.stringify({message:'D1 safety refresh progress',jobId:state.id,phase:state.phase,dataset:state.dataset,offset:state.offset,received:state.received}));
  }
}
