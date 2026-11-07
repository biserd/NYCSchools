import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync,readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '../shared/schema';
import type { School } from '../shared/schema';
import { buildDistrictAverages,districtAveragesForSchool } from '../shared/district-averages';
import { latestAssessmentYear,currentRankingScore,currentAcademicRankingScore } from '../shared/current-ranking';
import { buildRankingReport } from '../shared/ranking-report';
import { calculateOverallScore } from '../shared/school-utils';
import { searchMuseSchools,MUSE_RESEARCH_TOOLS } from '../server/museResearch';
import { handleMCPRequest } from '../server/mcp';
import { storage } from '../server/storage';
import { withDatabaseInstance,wrapDatabase } from '../server/db';

const school=(extra:Partial<School>):School=>({dbn:'02M001',name:'Sample',district:2,address:'Public school address',grade_band:'K-5',
  academics_score:99,ela_proficiency:0,math_proficiency:40,climate_score:60,progress_score:60,
  assessment_year:'2025-26',assessment_source:'NYCPS spring 2026',ela_tested_count:100,math_tested_count:100,
  ela_eligible_count:null,math_eligible_count:null,ela_participation_rate:null,math_participation_rate:null,
  demographics_year:null,enrollment:null,ell_percent:null,iep_percent:null,...extra} as School);
const rows=[
  school({demographics_year:'2025-26',enrollment:600,ell_percent:0,iep_percent:0}),
  school({dbn:'02M002',ela_proficiency:80,math_proficiency:100,climate_score:80,progress_score:80,demographics_year:'2025-26',enrollment:200,ell_percent:20,iep_percent:10}),
  school({dbn:'02M003',ela_proficiency:100,math_proficiency:100,climate_score:null,progress_score:100}),
  school({dbn:'02M004',ela_proficiency:100,math_proficiency:100,ela_tested_count:49,math_tested_count:49}),
  school({dbn:'02M005',assessment_year:'2024-25',ela_proficiency:100,math_proficiency:100,climate_score:100,progress_score:100,demographics_year:'2024-25',enrollment:10000,ell_percent:99}),
  school({dbn:'02M006',name:'High School',grade_band:'9-12',ela_proficiency:100,math_proficiency:100,graduation_rate_4yr:100,college_readiness_rate:100,progress_score:100,demographics_year:'2025-26',enrollment:800,ell_percent:30}),
  school({dbn:'02M007',grade_band:'2K',ela_proficiency:100,math_proficiency:100,demographics_year:'2025-26',enrollment:0,ell_percent:100}),
  school({dbn:'12X001',district:12,ela_proficiency:0,math_proficiency:0,climate_score:0,progress_score:0,demographics_year:'2025-26',enrollment:0,ell_percent:0,iep_percent:0}),
  school({dbn:'84K001',district:84,assessment_year:'2022-23',ela_proficiency:99,math_proficiency:99,climate_score:99,progress_score:99}),
];
const averages=buildDistrictAverages([...rows,rows[0]],2);
assert.equal(averages.schoolCount,6,'canonical deduplication and early-childhood exclusion');
assert.equal(averages.assessmentYear,'2025-26');assert.equal(averages.assessmentSchoolCount,3);
assert.equal(averages.elaProficiency,60);assert.equal(averages.mathProficiency,80);
assert.equal(averages.academicsScore,70,'derive academics from subject results, not cached 99');
assert.equal(averages.overallScore,64,'mean actual school ratings (44 and 84), not synthetic recombination of mismatched components');
assert.equal(averages.ratedSchoolCount,2);assert.equal(averages.highSchoolOverallScore,100);assert.equal(averages.highSchoolRatedCount,1);
assert.equal(averages.demographicsYear,'2025-26');assert.equal(averages.demographicsSchoolCount,3);
assert.equal(averages.enrollment,533);assert.equal(averages.ellPercent,16.7,'explicit unweighted school mean; include a genuine zero');
assert.equal(averages.metricCounts.ellPercent,3);assert.equal(averages.studentTeacherRatio,null,'no fabricated 15:1 default');
const zero=buildDistrictAverages(rows,12);assert.equal(zero.overallScore,0);assert.equal(zero.elaProficiency,0);assert.equal(zero.ellPercent,0);assert.equal(zero.enrollment,0);
const empty=buildDistrictAverages(rows,30);assert.equal(empty.overallScore,null);assert.equal(empty.elaProficiency,null);assert.equal(empty.academicsScore,null);assert.equal(empty.enrollment,null);
const oldDistrict=buildDistrictAverages(rows,84);assert.equal(oldDistrict.assessmentYear,'2025-26');assert.equal(oldDistrict.elaProficiency,null,'district without new results cannot fall back to 2022');
assert.equal(districtAveragesForSchool(averages,rows[4])?.overallScore,null);
assert.equal(districtAveragesForSchool(averages,rows[4])?.elaProficiency,null);
assert.equal(districtAveragesForSchool(averages,rows[4])?.ellPercent,null);
assert.equal(districtAveragesForSchool(averages,rows[5])?.overallScore,100);
assert.equal(districtAveragesForSchool(averages,rows[5])?.academicsScore,null);
const year=latestAssessmentYear(rows);assert.equal(year,'2025-26');assert.equal(currentRankingScore(rows[4],year),-1);assert.equal(currentRankingScore(rows[0],year),44);
assert.equal(currentAcademicRankingScore(rows[0],year),20);assert.equal(currentAcademicRankingScore(rows[5],year),-1);
const results=searchMuseSchools(rows,{district:2,limit:20},'https://nycschoolsratings.com');
assert.equal(results.ranking_assessment_year,'2025-26');assert.equal(results.schools.find(s=>s.dbn==='02M005')?.ranking_eligible,false);
const report=buildRankingReport(rows,'elementary');assert.equal(report.year,'2025-26');assert.ok(report.groups.flatMap(g=>g.rows).every(r=>!['02M005','84K001'].includes(r.dbn)));
const noNewEligible=buildRankingReport([rows[4],school({dbn:'02M010',assessment_year:'2026-27',math_proficiency:null})],'elementary');
assert.equal(noNewEligible.year,'2026-27');assert.equal(noNewEligible.eligible,0,'never silently rank the older year if new results are suppressed');

const sqlite=new DatabaseSync(':memory:');for(const file of readdirSync('migrations-d1').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(`migrations-d1/${file}`,'utf8'));
for(const s of rows){
 const {demographics_year,...record}=s;
 const keys=Object.keys(record);sqlite.prepare(`INSERT INTO schools(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(record) as any[]);
 sqlite.prepare('INSERT INTO school_profile_metadata(dbn,demographics_year) VALUES(?,?)').run(s.dbn,demographics_year??null);
}
const database=wrapDatabase(drizzle(async(query,params,method)=>{const s=sqlite.prepare(query);s.setReturnArrays(true);return {rows:method==='get'?s.get(...params):s.all(...params)} as any;},{schema}));
await withDatabaseInstance(database,async()=>{
 const stored=await storage.getSchools();assert.equal((await storage.getSchool('02M001'))?.academics_score,20);
 const single=await storage.getDistrictAverages(2),all=await storage.getAllDistrictAverages();assert.deepEqual(single,all.get(2));assert.deepEqual(single,buildDistrictAverages(stored,2));
 assert.deepEqual(await storage.getCitywideAverages(),buildDistrictAverages(stored,0));
 const response=await handleMCPRequest({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_top_schools',arguments:{grade_band:'ES',limit:25}}});
 assert.equal(response.error,undefined);const top=response.result.structuredContent;
 assert.equal(top.assessment_year,'2025-26');assert.ok(top.top_schools.every((s:any)=>!['02M005','84K001'].includes(s.dbn)));
 const current=await handleMCPRequest({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'search_schools',arguments:{district:2,limit:20}}},{allowedTools:MUSE_RESEARCH_TOOLS});
 assert.equal(current.result.structuredContent.schools.find((s:any)=>s.dbn==='02M005').ranking_eligible,false);
});sqlite.close();
console.log('PASS: current-year rankings, full-pair denominators, school-weighted averages, real rating means, separate HS cohort, missing/zero handling, no older-year fallback, canonical score recalculation, and storage/MCP parity.');
