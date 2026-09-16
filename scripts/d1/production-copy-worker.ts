// Authenticated remote-preview tooling ONLY. Never deploy a public data endpoint.
// Neon source is transaction-level READ ONLY; mutations target only the new D1.
import source from './source-export-worker.js';
import * as schema from '../../shared/schema';
import {getTableConfig,SQLiteTable} from 'drizzle-orm/sqlite-core';
import {finalSyncHandler} from './final-sync-handler';
import {productionSmokeHandler} from './production-smoke-handler';
const targetId='35237f81-df27-4908-be1a-1226faf501e0';
const tables=new Map(Object.values(schema).filter(v=>v instanceof SQLiteTable).map(t=>{const c=getTableConfig(t);return [c.name,c];}));
export default {async fetch(request:Request,env:ProductionCopyEnv){
 if(env.COPY_TARGET_ID!==targetId||Date.now()>=Date.parse(env.COPY_EXPIRES_AT))return new Response('Copy unavailable',{status:403});
 try{
  const url=new URL(request.url);
  if(url.pathname.startsWith('/smoke/'))return await productionSmokeHandler(request,env.DB);
  if(url.pathname.startsWith('/final/'))return await finalSyncHandler(request,env.DB);
  if(url.pathname.startsWith('/source/')){
   if(request.method!=='GET')return new Response('Source is read only',{status:405});
   url.pathname=url.pathname.slice('/source'.length);
   return await source.fetch(new Request(url,request),{HYPERDRIVE:env.HYPERDRIVE,ALLOW_PRIVATE_REHEARSAL:'true'});
  }
  if(url.pathname==='/inventory'&&request.method==='GET'){
   const counts:Record<string,number>={};for(const name of tables.keys())counts[name]=(await env.DB.prepare(`SELECT count(*) n FROM "${name}"`).first<number>('n'))!;
   return Response.json({targetId,counts,foreignKeys:(await env.DB.prepare('PRAGMA foreign_key_check').all()).results});
  }
  const table=url.searchParams.get('table');if(!table||!tables.has(table))return new Response('Invalid table',{status:400});
  if(url.pathname==='/rows'&&request.method==='GET'){
   const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return new Response('Invalid offset',{status:400});
   const limit=table==='nypd_complaints'?5000:500;
   return Response.json((await env.DB.prepare(`SELECT * FROM "${table}" ORDER BY 1,2 LIMIT ${limit} OFFSET ?`).bind(offset).all()).results);
  }
  if(url.pathname==='/import'&&request.method==='POST'){
   const input=await request.json() as {expectedDatabase:string;rows:Record<string,unknown>[]};
   if(input.expectedDatabase!==targetId||!Array.isArray(input.rows)||input.rows.length>(table==='nypd_complaints'?5000:500))return new Response('Invalid import',{status:400});
   if(!input.rows.length)return Response.json({inserted:0});
   const allowed=new Set(tables.get(table)!.columns.map(c=>c.name)),columns=Object.keys(input.rows[0]);
   if(!columns.length||columns.length>100||columns.some(c=>!allowed.has(c)))throw Error('Invalid columns');
   if(input.rows.some(row=>Object.keys(row).length!==columns.length||columns.some(c=>!(c in row))))throw Error('Column mismatch');
   const statements:D1PreparedStatement[]=[],size=Math.floor(100/columns.length);
   for(let i=0;i<input.rows.length;i+=size){const rows=input.rows.slice(i,i+size);
    statements.push(env.DB.prepare(`INSERT INTO "${table}" (${columns.map(c=>`"${c}"`).join(',')}) VALUES ${rows.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')}`).bind(...rows.flatMap(row=>columns.map(c=>row[c]))));
   }
   for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));
   return Response.json({inserted:input.rows.length});
  }
  return new Response('Not allowed',{status:405});
 }catch{return Response.json({error:'Copy operation failed; inspect aggregate counts before retrying.'},{status:500});}
}};
