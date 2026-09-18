import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Deliberately not configurable: this test must never target production.
const base = 'https://nyc-schools-ratings-d1-staging.biser-d.workers.dev';
const marker = `tuck-smoke-${randomUUID()}`;
const identities = [0, 1].map(n => ({ email: `${marker}-${n}@example.invalid`, password: randomBytes(24).toString('hex'), cookie: '' }));
async function call(path, account, method = 'GET', body, origin = base) {
  const response = await fetch(base + path, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', Origin: origin, ...(account?.cookie ? { Cookie: account.cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (account && response.headers.getSetCookie().length) account.cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const raw = await response.text();
  let value; try { value = JSON.parse(raw); } catch { value = raw; }
  return { response, value };
}
const preview = await call('/tuck');
assert.equal(preview.response.headers.get('x-staging-database'), 'D1');
assert.equal(preview.response.status, 200);
assert.match(preview.value, /<title>Tuck \| NYC School Ratings<\/title>/);
assert.match(preview.value, /name="robots" content="noindex, nofollow"/);
assert.equal((await call('/family')).response.headers.get('location'), '/tuck');
assert.equal((await call('/api/tuck/overview')).response.status, 401);
try {
  for (const account of identities) {
    const registered = await call('/api/register', account, 'POST', { email: account.email, password: account.password, firstName: 'Synthetic Tuck check' });
    assert.equal(registered.response.status, 201);
    assert.ok(account.cookie);
    assert.equal((await call('/api/tuck/household', account, 'POST')).response.status, 200);
  }
  const [a, b] = identities;
  const child = await call('/api/tuck/children', a, 'POST', { nickname: 'Synthetic child', schoolDbn: '02M475' });
  assert.equal(child.response.status, 201);
  const event = await call('/api/tuck/events', a, 'POST', { title: 'Synthetic school visit', date: '2027-03-14', childId: child.value.id });
  assert.equal(event.response.status, 201);
  assert.equal((await call('/api/tuck/overview', a, 'GET', undefined, 'https://other.invalid')).response.status, 403);
  const own = await call('/api/tuck/overview', a);
  assert.equal(own.value.events.length, 1);
  assert.equal(own.value.children[0].schoolDbn, '02M475');
  assert.equal(own.value.capabilities.whatsapp, false);
  const other = await call('/api/tuck/overview', b);
  assert.equal(other.value.events.length, 0);
  assert.equal(other.value.children.length, 0);
  assert.equal((await call(`/api/tuck/events/${event.value.id}`, b, 'DELETE')).response.status, 404);
  assert.equal((await call('/api/tuck/events', b, 'POST', { title: 'Cross-family test', date: '2027-03-14', childId: child.value.id })).response.status, 404);
  assert.equal((await call(`/api/tuck/events/${event.value.id}`, a, 'DELETE')).response.status, 204);
  assert.equal((await call(`/api/tuck/children/${child.value.id}`, a, 'DELETE')).response.status, 204);
  console.log('Staging Tuck passed: HTML/redirect/noindex, real Ratings sessions, family writes, canonical school link, two-account isolation, CSRF and disabled messaging.');
} finally {
  for (const account of identities) if (account.cookie) await call('/api/logout', account, 'POST');
  // Exact generated test emails only; D1 foreign keys cascade their new family records.
  const emails = identities.map(account => `'${account.email}'`).join(',');
  const sql = `DELETE FROM sessions WHERE json_extract(sess,'$.userId') IN (SELECT id FROM users WHERE email IN (${emails})); DELETE FROM users WHERE email IN (${emails}); SELECT count(*) AS remaining_test_users FROM users WHERE email IN (${emails});`;
  const output = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'nyc-schools-ratings-d1-staging', '--remote', '--config', 'wrangler.d1-staging.jsonc', '--command', sql, '--json'], { encoding: 'utf8' });
  const results = JSON.parse(output);
  assert.equal(results.at(-1).results[0].remaining_test_users, 0);
  console.log('Synthetic staging accounts, sessions and family records cleaned up.');
}
