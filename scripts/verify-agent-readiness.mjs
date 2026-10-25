import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin = process.argv[2];
assert.ok(origin && /^https?:\/\//.test(origin), 'Pass the origin to verify');
const get = (path, options = {}) => fetch(new URL(path, origin), {...options, signal: AbortSignal.timeout(45000)});
for (const [path, type] of [
  ['/.well-known/api-catalog', 'application/linkset+json'],
  ['/.well-known/mcp/server-card.json', 'application/json'],
  ['/.well-known/agent-skills/index.json', 'application/json'],
  ['/auth.md', 'text/markdown'],
  ['/.well-known/oauth-protected-resource/mcp', 'application/json'],
]) {
  const res = await get(path); assert.equal(res.status, 200, path);
  assert.ok(res.headers.get('content-type')?.startsWith(type), path);
  assert.match(res.headers.get('link') || '', /rel="api-catalog"/);
  assert.equal(res.headers.get('set-cookie'),null,path);
  if (type.includes('json')) await res.json(); else assert.match(await res.text(), /# NYC School Ratings auth.md/);
  console.log('PASS', path);
}
const card = await (await get('/.well-known/mcp/server-card.json')).json();
assert.equal(new URL(card.transport.endpoint).origin, origin);
const skills = await (await get('/.well-known/agent-skills/index.json')).json();
for (const skill of skills.skills) {
  const body = await (await get(skill.url)).text();
  assert.equal(`sha256:${createHash('sha256').update(body).digest('hex')}`, skill.digest);
}
const prm = await (await get('/.well-known/oauth-protected-resource/mcp')).json();
assert.deepEqual(prm.bearer_methods_supported,['header']);
const rpc = async (method, params) => {
  const res = await get('/mcp/muse', {method:'POST',headers:{'content-type':'application/json','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  assert.equal(res.status,200); return res.json();
};
const tools = await rpc('tools/list');
assert.deepEqual(card.tools.map(t=>t.name),tools.result.tools.map(t=>t.name));
const found = await rpc('tools/call',{name:'get_school_details',arguments:{dbn:'02M422'}});
assert.equal(found.error,undefined);
const school = found.result.structuredContent;
assert.equal(school.dbn,'02M422');
const schoolPath = new URL(school.canonical_url).pathname;
const pages = ['/', '/methodology', '/pricing', schoolPath];
for (const path of pages) {
  const normal = await get(path, {headers:{Accept:'text/html'}});
  assert.equal(normal.status,200); assert.match(normal.headers.get('content-type'),/^text\/html/);
  assert.match(normal.headers.get('vary') || '', /Accept/i);
  const html = await normal.text();
  const converted = await get(path, {headers:{Accept:'text/markdown'}});
  assert.equal(converted.status,200); assert.match(converted.headers.get('content-type'),/^text\/markdown/);
  assert.match(converted.headers.get('vary') || '', /Accept/i);
  const md = await converted.text();
  assert.ok(md.length>100); assert.doesNotMatch(md,/<script|<div|<svg/i);
  assert.match(md,/Source: https:\/\/nycschoolsratings.com/);
  if(path===schoolPath)assert.match(md,/Assessment reporting year:/);
  const head = await get(path,{method:'HEAD',headers:{Accept:'text/markdown'}});
  assert.equal(head.status,200); assert.equal(await head.text(),'');
  const disabled = await get(path,{headers:{Accept:'text/markdown;q=0,text/html'}});
  assert.match(disabled.headers.get('content-type'),/^text\/html/);
  console.log('PASS public Markdown/HTML/HEAD/q=0',path,JSON.stringify({htmlBytes:Buffer.byteLength(html),markdownBytes:Buffer.byteLength(md)}));
}
for(const path of ['/family','/settings','/favorites','/login']) {
  const response=await get(path,{headers:{Accept:'text/markdown'}});
  assert.ok(!response.headers.get('content-type')?.startsWith('text/markdown'),path);
  assert.match(await response.text(),/noindex/i,path);
  console.log('PASS private page excluded',path);
}
assert.equal((await get('/agent-readiness-missing-page',{headers:{Accept:'text/markdown'}})).status,404);
assert.equal((await get('/school/00x000-not-a-real-school',{headers:{Accept:'text/markdown'}})).status,404);
const denied=await rpc('tools/call',{name:'create_calendar_event',arguments:{}});
assert.ok(denied.error || denied.result?.isError,'Public connector must not allow private writes');
console.log('PASS: deployed agent readiness, public data, and private access boundaries.');
