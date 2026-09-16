import * as schema from '../../shared/schema';
import {getTableConfig,SQLiteTable} from 'drizzle-orm/sqlite-core';
const tables=new Map(Object.values(schema).filter(v=>v instanceof SQLiteTable).map(t=>{const c=getTableConfig(t);return [c.name,c];}));
export async function finalSyncHandler(request:Request,binding:D1Database):Promise<Response>{
 if(new URL(request.url).pathname==='/final/sequences'&&request.method==='POST'){
  const input=await request.json() as {expectedDatabase:string;rows:{table_name:string;last_value:string|null}[]};
  if(input.expectedDatabase!=='35237f81-df27-4908-be1a-1226faf501e0'||!Array.isArray(input.rows)||input.rows.length>100)return new Response('Invalid sequence sync',{status:400});
  const maintenance=await fetch('https://nycschoolsratings.com/api/auth/user',{headers:{'Cache-Control':'no-cache'}});
  if(maintenance.status!==503||maintenance.headers.get('X-Migration-Maintenance')!=='true')return new Response('Production must be in maintenance',{status:409});
  for(const row of input.rows){if(!tables.has(row.table_name))throw Error('Unknown source sequence table');if(row.last_value===null)continue;const value=Number(row.last_value);if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid sequence');
   await binding.batch([binding.prepare('INSERT INTO sqlite_sequence(name,seq) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name=?)').bind(row.table_name,value,row.table_name),binding.prepare('UPDATE sqlite_sequence SET seq=max(seq,?) WHERE name=?').bind(value,row.table_name)]);
  }
  return Response.json({processed:input.rows.length});
 }
 const url=new URL(request.url),table=url.searchParams.get('table'),config=table?tables.get(table):undefined;
 if(!table||!config||table==='school_safety_recompute_rows')return new Response('Invalid source table',{status:400});
 const keys=[...new Set([...config.columns.filter(c=>c.primary).map(c=>c.name),...config.primaryKeys.flatMap(k=>k.columns.map(c=>c.name))])];
 if(!keys.length)throw Error('Missing primary key');
 if(url.pathname==='/final/schema'&&request.method==='GET')return Response.json({keys,columns:config.columns.map(c=>c.name)});
 if(request.method!=='POST'||!['/final/merge','/final/delete'].includes(url.pathname))return new Response('Not allowed',{status:405});
 const input=await request.json() as {expectedDatabase:string;rows:Record<string,unknown>[]};
 if(input.expectedDatabase!=='35237f81-df27-4908-be1a-1226faf501e0'||!Array.isArray(input.rows)||input.rows.length>5000)return new Response('Invalid final sync',{status:400});
 // Fail closed: never reconcile a database while the live app accepts writes.
 const maintenance=await fetch('https://nycschoolsratings.com/api/auth/user',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(10000)});
 if(maintenance.status!==503||maintenance.headers.get('X-Migration-Maintenance')!=='true')return new Response('Production must be in migration maintenance',{status:409});
 const allowed=new Set(config.columns.map(c=>c.name)),statements:D1PreparedStatement[]=[];
 if(url.pathname==='/final/delete'){
  for(const row of input.rows){if(Object.keys(row).length!==keys.length||keys.some(k=>!(k in row)))throw Error('Invalid key');
   statements.push(binding.prepare(`DELETE FROM "${table}" WHERE ${keys.map(k=>`"${k}"=?`).join(' AND ')}`).bind(...keys.map(k=>row[k])));
  }
 }else if(input.rows.length){
  const columns=Object.keys(input.rows[0]);if(columns.length!==allowed.size||columns.some(c=>!allowed.has(c))||input.rows.some(r=>Object.keys(r).length!==columns.length||columns.some(c=>!(c in r))))throw Error('Invalid columns');
  const size=Math.floor(100/columns.length),updates=columns.filter(c=>!keys.includes(c)).map(c=>`"${c}"=excluded."${c}"`).join(',');
  for(let i=0;i<input.rows.length;i+=size){const rows=input.rows.slice(i,i+size);
   statements.push(binding.prepare(`INSERT INTO "${table}" (${columns.map(c=>`"${c}"`).join(',')}) VALUES ${rows.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')} ON CONFLICT(${keys.map(k=>`"${k}"`).join(',')}) ${updates?'DO UPDATE SET '+updates:'DO NOTHING'}`).bind(...rows.flatMap(r=>columns.map(c=>r[c]))));
  }
 }
 for(let i=0;i<statements.length;i+=50)await binding.batch(statements.slice(i,i+50));
 return Response.json({processed:input.rows.length});
}
