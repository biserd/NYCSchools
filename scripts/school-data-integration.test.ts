import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
import { once } from 'node:events';
import express from 'express';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '../shared/schema';
import { withDatabaseInstance,wrapDatabase } from '../server/db';
import { storage } from '../server/storage';
import { getSchoolResearchData,registerSchoolResearchRoutes } from '../server/schoolResearchData';
import { handleMCPRequest } from '../server/mcp';
import { MUSE_RESEARCH_TOOLS } from '../server/museResearch';
import { SchoolDataComparisonView } from '../client/src/components/SchoolDataComparison';
import { serializeSchool } from '../server/schoolApiView';

const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync('migrations-d1').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(`migrations-d1/${file}`,'utf8'));
for(const [dbn,name,band] of [['02M158','Primary School','PK-5'],['02M475','High School A','9-12'],['10X445','High School B','9-12'],['06F014','Early provider','2K']]) {
  sqlite.prepare('INSERT INTO schools(dbn,name,district,address,grade_band,enrollment,ell_percent,iep_percent,assessment_year,ela_proficiency,math_proficiency,science_proficiency) VALUES(?,?,2,?,?,599,0,18.7,?,86,88.4,70)').run(dbn,name,'Test address',band,'2025-26');
  sqlite.prepare('INSERT INTO school_profile_metadata(dbn,demographics_year,demographics_source,science_assessment_year) VALUES(?,?,?,?)').run(dbn,dbn==='10X445'?null:'2025-26','NYCPS Demographic Snapshot','2024-25');
}
const blank={enrollment:599,elementary_enrollment:550,middle_enrollment:0,high_school_enrollment:0,ell_percent:0,iep_percent:18.7,asian_percent:10,black_percent:0,hispanic_percent:20,white_percent:60,multi_racial_percent:10,economic_need_index:null,reported_bounds:{economic_need_index:'Above 95%'}};
for(const dbn of ['02M158','02M475','06F014'])for(const year of ['2021-22','2022-23','2023-24','2024-25','2025-26','legacy-undated'])sqlite.prepare('INSERT INTO school_demographics_history(dbn,school_year,data,source_url) VALUES(?,?,?,?)').run(dbn,year,JSON.stringify({...blank,enrollment:year==='legacy-undated'?999:year==='2025-26'?599:651}),'https://infohub.nyced.org/source.xlsx');
for(const [dbn,year,exam,tested,pass,ready] of [
  ['02M475',2026,'Biology',135,100,96.3],['02M475',2026,'Living Environment',2,null,null],
  ['02M475',2026,'Common Core English',50,0,0],['02M475',2025,'Common Core English',60,91,80],
  ['02M475',2015,'Living Environment',100,90,70],['10X445',2023,'Living Environment',100,99,80],
])sqlite.prepare('INSERT INTO hs_regents(dbn,year,exam_name,total_tested,pass_rate,college_ready_rate) VALUES(?,?,?,?,?,?)').run(dbn,year,exam,tested,pass,ready);
const database=wrapDatabase(drizzle(async(query,params,method)=>{
  const statement=sqlite.prepare(query);statement.setReturnArrays(true);
  return {rows:method==='run'?statement.run(...params):method==='get'?statement.get(...params):statement.all(...params)} as any;
},{schema}));

await withDatabaseInstance(database,async()=>{
  const a=(await storage.getSchool('02M475'))!,b=(await storage.getSchool('10X445'))!;
  const research=await getSchoolResearchData(a);
  assert.equal(research.demographics.school_year,'2025-26');
  assert.equal(research.demographics.ell_percent,0);
  assert.equal(research.demographics.reported_bounds.economic_need_index,'Above 95%');
  assert.equal(research.enrollment_history.length,5);
  assert.ok(research.enrollment_history.every(r=>r.enrollment!==999));
  assert.equal(research.regents.latest_reporting_year,2026);
  assert.equal(research.regents.results.find(r=>r.exam_name==='Common Core English')?.pass_rate,0);
  assert.equal(research.regents.results.find(r=>r.exam_name==='Living Environment')?.pass_rate,null);
  assert.ok(research.regents.history.some(r=>r.reporting_year===2015));
  assert.ok(research.regents.results.some(r=>r.exam_name==='Biology'));
  const call=async(name:string,args:any,publicLane=true)=>{
    const response=await handleMCPRequest({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},publicLane?{allowedTools:MUSE_RESEARCH_TOOLS}:{});
    assert.equal(response.error,undefined,JSON.stringify(response.error));
    return response.result.structuredContent;
  };
  for(const publicLane of [true,false]) {
    const profile=await call('get_school_details',{dbn:'02m475'},publicLane);
    assert.deepEqual(profile.regents,research.regents);
    assert.equal(profile.enrollment_history.length,5);
    assert.equal(profile.demographics.school_year,'2025-26');
    assert.equal(publicLane?profile.academics.science_assessment_year:profile.science_assessment_year,'2024-25');
    const comparison=await call('compare_schools',{dbns:['02M475','10X445']},publicLane);
    const compared=comparison.schools??comparison.comparison;
    assert.equal(comparison.regents_comparison_reporting_year,2026);
    assert.equal(compared[1].regents.latest_reporting_year,2023);
    assert.deepEqual(compared[1].regents_comparison_results,[],'missing 2026 must not use a 2023 value');
    assert.equal(compared[1].demographics.school_year,null,'unknown demographic year must remain unknown');
    assert.equal(compared[0].enrollment_history.length,5);
  }
  const history=await call('get_school_history',{dbn:'02M475'},false);
  assert.equal(history.regents.latest_reporting_year,2026,'Regents/enrollment history remains available without ELA history');
  const early=await call('get_school_details',{dbn:'06F014'});
  assert.equal(early.rating.overall_score,null);assert.equal(early.academics.ela_proficiency,null);
  assert.equal(early.regents.latest_reporting_year,null);
  const v1=serializeSchool(a);assert.equal(v1.demographics_year,'2025-26');assert.equal(v1.science_assessment_year,'2024-25');assert.equal(v1.ell_percent,0);
  const discover=await handleMCPRequest({jsonrpc:'2.0',id:2,method:'server/discover'});
  assert.equal(discover.result.protocolVersion,'2025-11-25');
  const forbidden=await handleMCPRequest({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'get_favorites',arguments:{}}},{allowedTools:MUSE_RESEARCH_TOOLS});
  assert.ok(forbidden.error,'public research must not gain access to private tools');
  const unauthenticated=await handleMCPRequest({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'get_favorites',arguments:{}}});
  assert.match(unauthenticated.error?.message ?? '',/Authentication required/);
  const html=renderToStaticMarkup(React.createElement(SchoolDataComparisonView,{schools:[a,b],data:{[a.dbn]:research,[b.dbn]:await getSchoolResearchData(b)}}));
  for(const text of ['2025-26','2026','Biology','Living Environment','Scoring 80+','Above 95%','No published result for 2026'])assert.ok(html.includes(text),text);
  assert.ok(html.includes('Pass (65+): 0%'),'genuine zero is visible');
  assert.ok(!html.includes('2026-27'),'reporting year must not become an invented school-year range');
  assert.ok(!html.includes('>999<'),'undated legacy values must not enter the dated history');
  assert.ok(!html.includes('Regents Pass Rate</'),'legacy aggregate is not presented as refreshed per-exam data');
});

const app=express();app.use((_req,_res,next)=>void withDatabaseInstance(database,async()=>next()));registerSchoolResearchRoutes(app);
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
try {
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const result=await fetch(`${base}/api/schools/02m475/research-data`);assert.equal(result.status,200);
  const body=await result.json();assert.equal(body.regents.latest_reporting_year,2026);assert.equal(body.enrollment_history.length,5);
  assert.equal((await fetch(`${base}/api/schools/nope/research-data`)).status,400);
  assert.equal((await fetch(`${base}/api/schools/99M999/research-data`)).status,404);
}finally{server.close();sqlite.close();}
console.log('PASS: SQLite-backed canonical storage → shared research service → public/legacy MCP, history tool, developer serialization, HTTP, and comparison markup. Mixed years, null/zero, source bounds, old history, early providers and exam identity verified.');
