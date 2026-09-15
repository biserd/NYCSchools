import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
const source='.wrangler/d1-export',out='.wrangler/d1-import';
await mkdir(out,{recursive:true});
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
db.exec(await readFile('migrations-d1/0000_harsh_johnny_blaze.sql','utf8'));
db.exec(await readFile('migrations-d1/0001_sturdy_gabe_jones.sql','utf8'));
const tables=['schools','nyceec_centers','private_schools','school_survey_releases','school_survey_results','school_historical_scores','hs_admissions_program','hs_graduation','hs_regents','school_attendance','school_discipline','nyceec_ai_insights','admissions_offers','enrollment_data','admissions_metrics','private_school_history','school_zones','school_safety_index','nypd_complaints'];
const quote=value=>value===null?'NULL':typeof value==='number'?String(value):`'${String(value).replaceAll("'","''")}'`;
const manifest=[];
for(const table of tables){
 const meta=JSON.parse(await readFile(`${source}/${table}.meta.json`,'utf8'));
 const target=db.prepare(`PRAGMA table_info("${table}")`).all().map(c=>c.name);
 const columns=meta.columns.filter(c=>target.includes(c.column_name));
 const excluded=meta.columns.filter(c=>!target.includes(c.column_name)).map(c=>c.column_name);
 if(excluded.length)throw Error(`Unmapped ${table} columns: ${excluded}`);
 const names=columns.map(c=>`"${c.column_name}"`).join(',');
 const insert=db.prepare(`INSERT INTO "${table}" (${names}) VALUES (${columns.map(()=>'?')})`);
 const files=(await readdir(source)).filter(f=>new RegExp(`^${table}\\.\\d+\\.json$`).test(f)).sort((a,b)=>Number(a.split('.')[1])-Number(b.split('.')[1]));
 let count=0,part=0,body='',maxRowBytes=0;
 async function flush(){if(!body)return;const file=`${out}/${String(tables.indexOf(table)).padStart(2,'0')}-${table}-${part++}.sql`;await writeFile(file,body);manifest.push({table,file});body='';}
 for(const file of files){
  const rows=JSON.parse(await readFile(`${source}/${file}`,'utf8'));
  db.exec('BEGIN');
  for(const row of rows){
   const values=columns.map(c=>{let v=row[c.column_name];if(v===null)return null;if(c.data_type.startsWith('timestamp')){v=Date.parse(v);if(!Number.isFinite(v))throw Error(`Invalid date ${table}.${c.column_name}`);return v;}if(c.data_type==='boolean')return v?1:0;if(c.data_type==='jsonb'||c.data_type==='json'||c.data_type==='ARRAY')return JSON.stringify(v);return v;});
   const rowBytes=Buffer.byteLength(JSON.stringify(values));maxRowBytes=Math.max(maxRowBytes,rowBytes);if(rowBytes>1900000)throw Error(`Oversized row ${table}`);
   insert.run(...values);count++;
   // No OR IGNORE: a duplicate or failed constraint must stop the migration.
   const statement=`INSERT INTO "${table}" (${names}) VALUES (${values.map(quote).join(',')});\n`;
   if(Buffer.byteLength(statement)>95000)throw Error(`Oversized SQL statement ${table}; use bound import for this row`);
   body+=statement;if(body.length>8_000_000)await flush();
  }
  db.exec('COMMIT');
 }
 await flush();if(count!==meta.count)throw Error(`Count mismatch ${table}: ${count}/${meta.count}`);
 console.log(`${table}: ${count}, maximum row ${maxRowBytes} bytes`);
}
const violations=db.prepare('PRAGMA foreign_key_check').all();if(violations.length)throw Error(JSON.stringify(violations));
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
console.log('All source rows converted; foreign keys valid.');
