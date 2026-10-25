import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import express from 'express';
import { once } from 'node:events';
import { prefersMarkdown, publicPageMarkdown, isAgentPublicPage } from '../server/agentMarkdown';
import { apiCatalog, mcpServerCard, skillsIndex, researchSkill, authMarkdown, registerAgentDiscovery } from '../server/agentDiscovery';
import { MUSE_TOOL_DEFINITIONS, MUSE_RESEARCH_TOOLS } from '../server/museResearch';

const origin = 'https://nycschoolsratings.com';
for (const header of [undefined, '*/*', 'text/*', 'text/html', 'text/markdown;q=0', 'text/markdown;q=oops', 'text/markdown;q=1.1', 'text/html, text/markdown', 'text/markdown;q=.5,text/html;q=.9', 'text/markdown;q=.5,*/*;q=1']) assert.equal(prefersMarkdown(header), false, header);
for (const header of ['text/markdown', 'TEXT/MARKDOWN', 'text/markdown;q=.9,text/html;q=.5', 'text/markdown,text/html;q=0,*/*;q=1', 'text/markdown,*/*;q=.1']) assert.equal(prefersMarkdown(header), true, header);
const html = `<html><head><title>School</title><link rel="canonical" href="${origin}/school/02m422-quest-to-learn"/></head><body><div id="root" data-server-rendered="true"><div data-boot-header>Duplicate title</div><main><h1>Quest &amp; Learn</h1><p>Assessment year: 2024–25. Missing is not zero.</p><h2>Sources</h2><p><a href="/methodology">Methodology</a> <a href="javascript:alert(1)">Bad link</a></p><ul><li>2-K: not offered</li></ul><table><tr><th>Year</th><th>ELA</th></tr><tr><td>2024–25</td><td>36%</td></tr></table><svg>chart internals</svg><form>private input</form><p hidden>secret</p><script>bad code</script></main></div></body></html>`;
const md = publicPageMarkdown('/school/02m422-quest-to-learn', html, origin)!;
assert.match(md, /# Quest & Learn/);
assert.match(md, /Assessment year: 2024–25/);
assert.match(md, /\[Methodology\]\(https:\/\/nycschoolsratings.com\/methodology\)/);
assert.match(md, /\| Year \| ELA \|\n\| --- \| --- \|\n\| 2024–25 \| 36% \|/);
assert.doesNotMatch(md, /Duplicate title|chart internals|private input|secret|bad code|javascript:/);
for (const path of ['/family', '/settings', '/admin/parent-agent', '/favorites', '/login', '/auth/magic-link/private-token', '/api/auth/user', '/thanks', '/does-not-exist']) {
  assert.equal(isAgentPublicPage(path), false, path);
  assert.equal(publicPageMarkdown(path, html, origin), null, path);
}
assert.equal(publicPageMarkdown('/', '<div id="root"></div>', origin), null);
assert.equal(publicPageMarkdown('/', html.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">'), origin), null);
const skill = researchSkill(origin);
assert.equal(skillsIndex(origin).skills[0].digest, `sha256:${createHash('sha256').update(skill).digest('hex')}`);
assert.deepEqual(mcpServerCard(origin).tools, MUSE_RESEARCH_TOOLS.map(name => MUSE_TOOL_DEFINITIONS[name]));
assert.equal(mcpServerCard(origin).authentication.required, false);
assert.equal(apiCatalog(origin).linkset.length, 3);
assert.match(authMarkdown(origin), /not implement Auth.md automated user-account provisioning/);

const app = express(); registerAgentDiscovery(app, () => origin);
app.get('/', (_req, res) => res.send('ordinary HTML unchanged'));
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as {port:number}).port;
try {
  const base = `http://127.0.0.1:${port}`;
  const catalog = await fetch(`${base}/.well-known/api-catalog`);
  assert.equal(catalog.status, 200);
  assert.match(catalog.headers.get('content-type')!, /^application\/linkset\+json/);
  assert.match(catalog.headers.get('link')!, /rel="api-catalog"/);
  assert.deepEqual(await catalog.json(), apiCatalog(origin));
  const skillResponse = await fetch(`${base}/.well-known/agent-skills/nyc-school-research/SKILL.md`);
  assert.equal(await skillResponse.text(), skill);
  for (const path of ['/auth.md','/.well-known/mcp/server-card.json','/.well-known/agent-skills/index.json']) {
    const response = await fetch(`${base}${path}`, {method:'HEAD'});
    assert.equal(response.status,200); assert.equal(await response.text(),'');
    assert.equal(response.headers.get('set-cookie'),null);
  }
  assert.equal(await (await fetch(base)).text(),'ordinary HTML unchanged');
} finally { server.close(); }
console.log('PASS: agent discovery contracts, served skill hash, negotiation, public-page conversion, tables, noindex and private-page exclusions.');
