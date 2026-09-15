import {mkdir,writeFile,access} from 'node:fs/promises';
const base='http://127.0.0.1:8792';
const tables=['schools','nyceec_centers','private_schools','school_survey_releases','school_survey_results','school_historical_scores','hs_admissions_program','hs_graduation','hs_regents','school_attendance','school_discipline','nyceec_ai_insights','admissions_offers','enrollment_data','admissions_metrics','private_school_history','school_zones','school_safety_index','nypd_complaints'];
const out='.wrangler/d1-export';await mkdir(out,{recursive:true});
async function get(path){for(let i=0;i<4;i++){try{const r=await fetch(base+path);if(!r.ok)throw Error(`${r.status} ${path}`);return await r.json();}catch(e){if(i===3)throw e;await new Promise(r=>setTimeout(r,1000*(i+1)));}}}
await writeFile(`${out}/inventory.json`,JSON.stringify(await get('/inventory')));
for(const table of tables){
 const columns=await get(`/columns?table=${table}`),{count}=await get(`/count?table=${table}`);
 await writeFile(`${out}/${table}.meta.json`,JSON.stringify({table,columns,count}));
 const step=table==='nypd_complaints'?5000:500;
 for(let offset=0;offset<count;offset+=step){
  const file=`${out}/${table}.${offset}.json`;
  try{await access(file);continue;}catch{}
  const rows=await get(`/rows?table=${table}&offset=${offset}`);
  if(rows.length!==Math.min(step,count-offset))throw Error(`Incomplete page ${table}/${offset}`);
  await writeFile(file,JSON.stringify(rows));
 }
 console.log(`${table}: ${count} exported`);
}
