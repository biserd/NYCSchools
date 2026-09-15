import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const base='https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
const email=`d1-webtest-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');
let cookie='';const results=[];
async function call(path,method='GET',body){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const set=r.headers.getSetCookie();if(set.length)cookie=set.map(x=>x.split(';')[0]).join('; ');
 let value;try{value=await r.json();}catch{value=null;}
 return {status:r.status,value,headers:r.headers};
}
try{
 let r=await call('/api/register','POST',{email,password,firstName:'Synthetic migration test'});assert.equal(r.status,201,JSON.stringify(r.value));assert.ok(cookie);assert.equal(r.value.password,undefined);results.push('register and secure session cookie');
 r=await call('/api/auth/user');assert.equal(r.value.email,email);results.push('session survives next request');
 r=await call('/api/favorites','POST',{schoolDbn:'02M475'});assert.equal(r.status,201,JSON.stringify(r.value));
 r=await call('/api/favorites');assert.ok(r.value.some(x=>x.schoolDbn==='02M475'));results.push('authenticated favorite write/read');
 r=await call('/api/favorites','POST',{schoolDbn:'02M475'});assert.equal(r.status,409);results.push('duplicate favorite rejected');
 r=await call('/api/tracked-schools','POST',{schoolDbn:'02M475'});assert.equal(r.status,403);results.push('free-tier authorization retained');
 r=await call('/api/favorites/02M475','DELETE');assert.equal(r.status,204);results.push('favorite deletion');
 r=await call('/api/logout','POST');assert.equal(r.status,200);cookie='';
 r=await call('/api/favorites');assert.equal(r.status,401);results.push('logout and anonymous write protection');
 r=await call('/api/login','POST',{email,password:'wrong-password'});assert.equal(r.status,401);results.push('invalid password rejected');
 r=await call('/api/login','POST',{email,password});assert.equal(r.status,200);r=await call('/api/auth/user');assert.equal(r.value.email,email);results.push('password login and session persistence');
 assert.equal(r.headers.get('x-staging-database'),'D1');assert.match(r.headers.get('x-robots-tag'),/noindex/);results.push('D1 staging/noindex headers');
 await call('/api/logout','POST');
 await writeFile('.wrangler/d1-auth-verification.json',JSON.stringify({passed:results},null,2));console.log(JSON.stringify({passed:results},null,2));
}finally{const r=await fetch(`http://127.0.0.1:8793/cleanup-web-test?email=${email}`,{method:'POST'});assert.equal(r.status,200,await r.text());}
