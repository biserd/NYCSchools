import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
async function query(sql){const start=performance.now();const r=await fetch('http://127.0.0.1:8793/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params:[],method:'all'})});assert.equal(r.status,200);return {rows:(await r.json()).rows,ms:Math.round(performance.now()-start)};}
const nearby=`WITH nearby AS MATERIALIZED (SELECT law_cat_cd,ofns_desc,complaint_date,
 2*6371000*asin(min(1,sqrt(pow(sin(radians(latitude-40.7)/2),2)+cos(radians(40.7))*cos(radians(latitude))*pow(sin(radians(longitude+74)/2),2)))) distance
 FROM nypd_complaints INDEXED BY nypd_safety_cover_idx
 WHERE latitude>=40.628 AND latitude<40.772 AND longitude>=-74.095 AND longitude<=-73.905
 AND complaint_date>=1726438206753 AND complaint_date<=1789510206753)`;
const radii=[402,805,1609,8047];
const old=await query(`${nearby}, radii(radius) AS (VALUES ${radii.map(r=>`(${r})`).join(',')})
 SELECT radius,complaint_date>=1757974206753 current,law_cat_cd,ofns_desc,count(*)
 FROM nearby CROSS JOIN radii WHERE distance<=radius GROUP BY radius,current,law_cat_cd,ofns_desc`);
const improved=await query(`${nearby} SELECT complaint_date>=1757974206753 current,law_cat_cd,ofns_desc,${radii.map(r=>`sum(distance<=${r})`).join(',')}
 FROM nearby WHERE distance<=8047 GROUP BY current,law_cat_cd,ofns_desc`);
const expanded=improved.rows.flatMap(([current,category,offense,...counts])=>counts.flatMap((count,i)=>count?[[radii[i],current,category,offense,count]]:[]));
const normalize=rows=>rows.map(r=>JSON.stringify(r)).sort();assert.deepEqual(normalize(expanded),normalize(old.rows));
const result={checkedAt:new Date().toISOString(),oldMs:old.ms,improvedMs:improved.ms,allAggregateGroupsMatch:true,groups:old.rows.length};
await writeFile('.wrangler/d1-safety-query-benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
