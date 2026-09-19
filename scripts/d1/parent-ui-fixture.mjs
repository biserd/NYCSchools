import {randomUUID,randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
// Requires the authenticated, private staging test-worker preview on localhost.
// No production targets, real recipients, provider sends or billing calls.
const base='https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
if(process.argv[2]==='cleanup') {
  const email=process.argv[3];
  assert.match(email,/^d1-webtest-[a-f0-9-]+@example\.invalid$/);
  const response=await fetch(`http://127.0.0.1:8793/cleanup-web-test?email=${email}`,{method:'POST'});
  assert.equal(response.status,200);console.log('Synthetic UI account and related records removed.');
} else {
  const email=`d1-webtest-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('hex');
  console.log(JSON.stringify({cleanupEmail:email}));
  const registered=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email,password,firstName:'Synthetic preview'})});
  assert.equal(registered.status,201);
  const user=await registered.json();
  const cookie=registered.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  await fetch(base+'/api/tuck/household',{method:'POST',headers:{Origin:base,Cookie:cookie}});
  const token=randomBytes(32).toString('hex');
  const response=await fetch('http://127.0.0.1:8793/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'run',sql:'INSERT INTO magic_link_tokens(user_id,token_hash,expires_at) VALUES (?,?,?)',params:[user.id,createHash('sha256').update(token).digest('hex'),Date.now()+600000]})});
  assert.equal(response.status,200,await response.text());
  console.log(JSON.stringify({email,url:base+'/api/auth/magic-link/'+token}));
}
