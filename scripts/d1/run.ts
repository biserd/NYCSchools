/** Run existing ORM maintenance scripts against the isolated D1 staging preview.
 * Start wrangler dev -c wrangler.d1-test.jsonc --remote --port 8793 first.
 * No database URL, API credentials or maintenance endpoint is exposed publicly.
 */
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as schema from '../../shared/schema';
import { withDatabaseInstance, wrapDatabase } from '../../server/db';
const target=process.argv[2];
if(!target||!process.argv.includes('--d1-staging'))throw new Error('Usage: tsx scripts/d1/run.ts scripts/IMPORT.ts --d1-staging [arguments]');
const resolved=resolve(target),root=resolve('.');
if(!resolved.startsWith(root+'\\')&&!resolved.startsWith(root+'/'))throw new Error('Script must be in this repository');
const database=drizzle(async (sql,params,method)=>{
  const response=await fetch('http://127.0.0.1:8793/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params,method})});
  if(!response.ok)throw new Error(await response.text());
  return response.json() as Promise<{rows:unknown[]}>;
},{schema});
process.argv=[process.argv[0],target,...process.argv.slice(3).filter(a=>a!=='--d1-staging')];
await withDatabaseInstance(wrapDatabase(database),()=>import(pathToFileURL(resolved).href));
