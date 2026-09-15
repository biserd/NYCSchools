import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {SAFETY_OFFENSE_WEIGHTS,VIOLENT_FELONY_OFFENSES} from '../../shared/schema';
const dir='.wrangler/d1-export',files=await readdir(dir),schools=[];
for(const f of files.filter(f=>/^schools\.\d+\.json$/.test(f)))schools.push(...JSON.parse(await readFile(`${dir}/${f}`,'utf8')));
const report=[];
for(const key of ['06G262','02M475','31R005']){
 const response=await fetch(`http://127.0.0.1:8793/safety-calculation?school=${key}`);assert.ok(response.ok,await response.clone().text());const result=await response.json();
 const school=schools.find(s=>s.dbn===key),rad=Math.PI/180;
 const maxRadius=8047,latDelta=maxRadius/111320,lngDelta=maxRadius/(111320*Math.cos(school.latitude*rad));
 const prior=Date.parse(result.window.prior),from=Date.parse(result.window.from),to=Date.parse(result.window.to);
 const aggregates=result.rows.map((r:any)=>({radius:r.radiusMeters,current:{total:0,felony:0,violentFelony:0,misdemeanor:0,violation:0,byCategory:{} as Record<string,number>},prior:{total:0,felony:0,violentFelony:0,misdemeanor:0,violation:0,byCategory:{} as Record<string,number>}}));
 for(const f of files.filter(f=>/^nypd_complaints\.\d+\.json$/.test(f))){
  for(const c of JSON.parse(await readFile(`${dir}/${f}`,'utf8'))){
   const date=Date.parse(c.complaint_date);if(date<prior||date>to)continue;
   // Preserve the original algorithm's bounding-box prefilter before haversine.
   if(c.latitude<school.latitude-latDelta||c.latitude>school.latitude+latDelta||c.longitude<school.longitude-lngDelta||c.longitude>school.longitude+lngDelta)continue;
   const a=Math.sin((c.latitude-school.latitude)*rad/2)**2+Math.cos(school.latitude*rad)*Math.cos(c.latitude*rad)*Math.sin((c.longitude-school.longitude)*rad/2)**2;
   const distance=2*6371000*Math.asin(Math.sqrt(a));
   for(const r of aggregates){if(distance>r.radius)continue;const agg=date>=from?r.current:r.prior;agg.total++;if(c.law_cat_cd==='FELONY'){agg.felony++;if(VIOLENT_FELONY_OFFENSES.has(c.ofns_desc))agg.violentFelony++;}else if(c.law_cat_cd==='MISDEMEANOR')agg.misdemeanor++;else if(c.law_cat_cd==='VIOLATION')agg.violation++;if(c.ofns_desc)agg.byCategory[c.ofns_desc]=(agg.byCategory[c.ofns_desc]||0)+1;}
  }
 }
 for(const r of aggregates){const actual=result.rows.find((x:any)=>x.radiusMeters===r.radius);assert.deepEqual(actual.current,r.current);assert.deepEqual(actual.prior,r.prior);const a=r.current,weights=SAFETY_OFFENSE_WEIGHTS;const score=(a.violentFelony*weights.violentFelony+(a.felony-a.violentFelony)*weights.felony+a.misdemeanor*weights.misdemeanor+a.violation*weights.violation)/(Math.PI*(r.radius/1000)**2);assert.ok(Math.abs(score-actual.weightedRiskScore)<1e-8);}
 report.push({school:key,radii:aggregates.length,countsCategoriesAndWeightsMatch:true});console.log(`PASS ${key}: all four radii match the independent JavaScript calculation over all source complaints`);
}
await writeFile('.wrangler/d1-safety-parity-verification.json',JSON.stringify(report,null,2));
