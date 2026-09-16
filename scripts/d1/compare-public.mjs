import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const prod='https://nycschoolsratings.com',stage=process.argv.includes('--production-candidate')?'http://127.0.0.1:8796':'https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
const paths=['/api/schools','/api/twok-centers','/api/nyceec-centers','/api/private-schools','/api/schools/02M475','/api/schools/02M475/history','/api/schools/02M475/graduation','/api/schools/02M475/regents','/api/schools/02M475/attendance','/api/schools/02M475/discipline','/api/schools/02M475/admissions-programs','/api/schools/02M475/zone','/api/surveys/school/02M475','/api/twok-centers-stats','/api/nyceec-centers-stats','/api/private-schools-stats','/api/districts/averages','/api/districts/citywide','/api/districts/2/averages','/api/schools-trends-summary','/api/schools-trends','/api/blog/covid-recovery-data','/api/safety/public/06G262','/api/safe-and-strong'];
function normalize(v){if(Array.isArray(v))return v.map(normalize).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])]));return v;}
const hash=v=>createHash('sha256').update(JSON.stringify(normalize(v))).digest('hex');
const report=[];
for(const path of paths){
 const results=await Promise.all([prod,stage].map(async base=>{const start=Date.now();const r=await fetch(base+path);const text=await r.text();let body;try{body=JSON.parse(text);}catch{body=text;}return {status:r.status,ms:Date.now()-start,body};}));
 const [p,s]=results,match=p.status===s.status&&hash(p.body)===hash(s.body);
 const withoutImportTime=body=>Array.isArray(body)?body.map(({importedAt,...data})=>data):body;
 const expectedImportTimeDifference=!match&&path==='/api/surveys/school/02M475'&&p.status===200&&s.status===200&&hash(withoutImportTime(p.body))===hash(withoutImportTime(s.body));
 const passed=(match&&p.status===200)||expectedImportTimeDifference;
 report.push({path,match,passed,expectedImportTimeDifference,productionStatus:p.status,stageStatus:s.status,productionMs:p.ms,stageMs:s.ms,...(!match?{production:p.body,stage:s.body}:{})});
 console.log(`${passed?'PASS':'FAIL'} ${path} (${p.status}/${s.status})${expectedImportTimeDifference?' — only source-stage import timestamps differ':''}`);
}
await writeFile(process.argv.includes('--production-candidate')?'.wrangler/d1-production-candidate-parity.json':'.wrangler/d1-public-parity.json',JSON.stringify(report,null,2));
console.log(`${report.filter(r=>r.match).length}/${report.length} exact matches (array order ignored)`);
if(report.some(r=>!r.passed))process.exitCode=1;
