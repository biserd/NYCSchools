import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
async function query(sql,params=[]){
 const response=await fetch('http://127.0.0.1:8793/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params,method:'all'})});
 assert.equal(response.status,200);return (await response.json()).rows;
}
const settings=Object.fromEntries((await query("SELECT key,value FROM app_settings WHERE key IN ('d1_safety_refresh_job','safety_recompute_run_state')")).map(([key,value])=>[key,JSON.parse(value)]));
const job=settings.d1_safety_refresh_job,run=settings.safety_recompute_run_state;
const published=await query('SELECT count(*),min(safety_index),max(safety_index),min(period_end),max(period_end),count(DISTINCT school_type || char(0) || school_key) FROM school_safety_index');
const pending=await query('SELECT count(*),count(DISTINCT school_type || char(0) || school_key) FROM school_safety_recompute_rows WHERE run_id=?',[job.startedAt]);
const report={checkedAt:new Date().toISOString(),job,run,published:published[0],pending:pending[0]};
if(job.phase==='complete'){
 assert.ok(run.finalizedAt);assert.equal(pending[0][0],run.totalSchools*4);
 assert.equal(published[0][0],run.totalSchools*4);assert.equal(published[0][5],run.totalSchools);
 assert.ok(published[0][1]>=0&&published[0][2]<=100);
 assert.equal(published[0][3],Date.parse(job.startedAt));assert.equal(published[0][4],Date.parse(job.startedAt));
 const mismatch=await query(`WITH ranked AS (SELECT school_type,school_key,radius_meters,payload,
 percent_rank() OVER(PARTITION BY radius_meters ORDER BY json_extract(payload,'$.weightedRiskScore')) rp
 FROM school_safety_recompute_rows WHERE run_id=?)
 SELECT count(*) FROM ranked r JOIN school_safety_index s USING(school_type,school_key,radius_meters)
 WHERE s.safety_index != MAX(0,MIN(100,100-ROUND(r.rp*100)))
 OR s.total_reports != json_extract(r.payload,'$.totalReports')
 OR s.prior_period_total != json_extract(r.payload,'$.priorPeriodTotal')
 OR NOT json_valid(s.top_categories)`,[job.startedAt]);
 assert.equal(mismatch[0][0],0);report.rankAndCountMismatches=mismatch[0][0];
 report.complaints=(await query('SELECT count(*),min(complaint_date),max(complaint_date) FROM nypd_complaints'))[0];
 assert.ok(report.complaints[1]>=Date.parse(job.cutoff));
 report.passed=true;
 await writeFile('.wrangler/d1-refresh-final-verification.json',JSON.stringify(report,null,2));
}else{
 assert.ok(published[0][4]<Date.parse(job.startedAt),'Incomplete refresh changed published scores');
 report.atomicPublicationHeld=true;
 await writeFile('.wrangler/d1-refresh-in-progress-verification.json',JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report,null,2));
