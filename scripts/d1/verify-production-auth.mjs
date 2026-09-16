import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
const live=process.argv.includes('--live'),base=live?'https://nycschoolsratings.com':'http://127.0.0.1:8796';
const id='d1-cutover-smoke-'+randomUUID(),email=id+'@example.invalid',password=randomBytes(32).toString('hex'),passed=[];
let cookie='',created=false;
async function helper(path,body){const r=await fetch('http://127.0.0.1:8795/smoke/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200,'Synthetic account helper failed');return r.json();}
async function call(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});const set=r.headers.getSetCookie();if(set.length)cookie=set.map(v=>v.split(';')[0]).join('; ');let value;try{value=await r.json();}catch{value=null;}return {status:r.status,value,headers:r.headers};}
try{
 assert.equal((await helper('create',{id,passwordHash:await bcrypt.hash(password,10)})).created,true);created=true;
 let r=await call('/api/login','POST',{email,password:'incorrect'});assert.equal(r.status,401);passed.push('incorrect password rejected');
 r=await call('/api/login','POST',{email,password});assert.equal(r.status,200);assert.ok(cookie);assert.ok(r.headers.getSetCookie().some(c=>/HttpOnly/i.test(c)));if(live)assert.ok(r.headers.getSetCookie().some(c=>/Secure/i.test(c)));assert.equal(r.value.password,undefined);passed.push(live?'password login and Secure/HttpOnly session cookie':'password login and HttpOnly cookie (Secure attribute requires live HTTPS check)');
 r=await call('/api/auth/user');assert.equal(r.value.id,id);passed.push('session persisted in D1');
 r=await call('/api/favorites','POST',{schoolDbn:'02M475'});assert.equal(r.status,201);
 r=await call('/api/favorites');assert.ok(r.value.some(s=>s.schoolDbn==='02M475'));passed.push('favorite write and read');
 r=await call('/api/favorites','POST',{schoolDbn:'02M475'});assert.equal(r.status,409);passed.push('duplicate favorite rejected');
 r=await call('/api/tracked-schools','POST',{schoolDbn:'02M475'});assert.equal(r.status,403);passed.push('free-tier authorization preserved');
 r=await call('/api/favorites/02M475','DELETE');assert.equal(r.status,204);passed.push('favorite deletion');
 r=await call('/api/logout','POST');assert.equal(r.status,200);cookie='';assert.equal((await call('/api/favorites')).status,401);passed.push('logout and private-route protection');
}finally{if(created){assert.equal((await helper('cleanup',{id})).cleaned,true);passed.push('synthetic account, favorites and sessions removed');}}
await writeFile(`.wrangler/d1-production-${live?'live':'candidate'}-auth.json`,JSON.stringify({checkedAt:new Date().toISOString(),passed},null,2));console.log(JSON.stringify({passed},null,2));
