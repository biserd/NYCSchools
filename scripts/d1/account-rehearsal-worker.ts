// Authenticated remote preview only. NEVER deploy: contains real cloned account
// data in a separate D1 with no application, domain, public route or email binding.
import * as schema from '../../shared/schema';
import {getTableConfig,SQLiteTable} from 'drizzle-orm/sqlite-core';
const tables=new Map(Object.values(schema).filter(v=>v instanceof SQLiteTable).map(t=>{const config=getTableConfig(t);return [config.name,config];}));
export default {async fetch(request:Request,env:AccountRehearsalEnv){
 if(env.REHEARSAL_DATABASE_ID!=='a8bfb062-404e-46a6-8a92-fe54e55201db'||!(Date.now()<Date.parse(env.REHEARSAL_EXPIRES_AT)))return new Response('Rehearsal unavailable',{status:403});
 try {
  const url=new URL(request.url);
  if(url.pathname==='/inventory'&&request.method==='GET'){
   const counts:Record<string,number>={};for(const name of tables.keys())counts[name]=(await env.DB.prepare(`SELECT count(*) n FROM "${name}"`).first<number>('n'))!;
   return Response.json({counts,foreignKeys:(await env.DB.prepare('PRAGMA foreign_key_check').all()).results,sequences:(await env.DB.prepare('SELECT name,seq FROM sqlite_sequence').all()).results});
  }
  const table=url.searchParams.get('table');if(!table||!tables.has(table))return new Response('Invalid table',{status:400});
  if(url.pathname==='/rows'&&request.method==='GET'){
   const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return new Response('Invalid offset',{status:400});
   return Response.json((await env.DB.prepare(`SELECT * FROM "${table}" ORDER BY 1,2 LIMIT 500 OFFSET ?`).bind(offset).all()).results);
  }
  if(url.pathname==='/import'&&request.method==='POST'){
   const input=await request.json() as {expectedDatabase:string;rows:Record<string,unknown>[]};
   if(input.expectedDatabase!==env.REHEARSAL_DATABASE_ID||!Array.isArray(input.rows)||input.rows.length>500)return new Response('Invalid target or page',{status:400});
   const allowed=new Set(tables.get(table)!.columns.map(c=>c.name));
   const statements=input.rows.map(row=>{
    const columns=Object.keys(row);if(!columns.length||columns.length>100||columns.some(c=>!allowed.has(c)))throw Error('Invalid columns');
    return env.DB.prepare(`INSERT INTO "${table}" (${columns.map(c=>`"${c}"`).join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).bind(...columns.map(c=>row[c]));
   });
   for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));
   return Response.json({inserted:input.rows.length});
  }
  return new Response('Not allowed',{status:405});
 }catch{
  // Never echo SQL parameters, credentials, account identifiers or row content.
  return Response.json({error:'Rehearsal operation failed; inspect aggregate counts before retrying.'},{status:500});
 }
}};
