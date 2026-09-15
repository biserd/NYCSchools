/** Reproducible article evidence. Reads validated import export; never connects to a DB. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { SURVEY_INSTRUMENTS, type SurveyMetric, type SurveyInstrument } from '../shared/surveys';
import { quantile } from '../shared/survey-statistics';
type Release = {instrument: SurveyInstrument; hash:string; sourceUrl:string; rows:{sourceId:string;responseCount:number|null;responseRate:number|null;metrics:SurveyMetric[]}[]};
const [exportPath, sourceDirectory] = process.argv.slice(2);
if (!exportPath || !sourceDirectory) throw new Error('Usage: tsx scripts/build-survey-analysis.ts IMPORT_EXPORT SOURCE_DIRECTORY');
const releases:Release[] = JSON.parse(await fs.readFile(exportPath,'utf8'));
if (releases.length!==5 || new Set(releases.map(r=>r.instrument)).size!==5) throw new Error('Expected five distinct instruments');
const analysis = releases.map(release=>{
  if (!SURVEY_INSTRUMENTS.includes(release.instrument)) throw new Error('Unknown instrument');
  if(new Set(release.rows.map(r=>r.sourceId)).size!==release.rows.length) throw new Error('Duplicate source IDs');
  const topics = release.rows[0].metrics.map(metric=>{
    const values=release.rows.map(r=>r.metrics.find(m=>m.key===metric.key)?.value).filter((v):v is number=>v!=null);
    if(values.some(v=>!Number.isFinite(v)||v<0||v>100)) throw new Error('Invalid score');
    const bins=[{label:'0–49',lo:0,hi:50},{label:'50–69',lo:50,hi:70},{label:'70–79',lo:70,hi:80},{label:'80–89',lo:80,hi:90},{label:'90–99',lo:90,hi:100},{label:'100',lo:100,hi:101}].map(b=>({label:b.label,count:values.filter(v=>v>=b.lo&&v<b.hi).length}));
    if(bins.reduce((n,b)=>n+b.count,0)!==values.length) throw new Error('Bins do not reconcile');
    return {key:metric.key,label:metric.label,n:values.length,median:quantile(values,.5),q1:quantile(values,.25),q3:quantile(values,.75),bins};
  });
  return {instrument:release.instrument,sourceUrl:release.sourceUrl,sourceHash:release.hash,rows:release.rows.length,withScores:release.rows.filter(r=>r.metrics.some(m=>m.value!==null)).length,belowTen:release.rows.filter(r=>r.responseCount!==null&&r.responseCount<10).length,medianResponses:quantile(release.rows.map(r=>r.responseCount).filter((v):v is number=>v!==null),.5),topics};
});
for(const release of releases){const bytes=await fs.readFile(path.join(sourceDirectory,new URL(release.sourceUrl).pathname.split('/').pop()!));if(createHash('sha256').update(bytes).digest('hex')!==release.hash)throw new Error('Workbook hash mismatch');}
await fs.writeFile('shared/survey-analysis.generated.json',JSON.stringify({year:2026,asOf:'2026-09-15',method:'Unweighted summary-sheet record medians; published values only; nulls excluded per topic; R-7 interpolated quartiles. Not respondent-weighted citywide percentages.',releases:analysis},null,2)+'\n');
console.log(JSON.stringify(analysis.map(({instrument,rows,withScores,belowTen})=>({instrument,rows,withScores,belowTen})),null,2));
