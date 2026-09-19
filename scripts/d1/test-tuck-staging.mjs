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
const preview = await call('/family');
assert.equal(preview.response.headers.get('x-staging-database'), 'D1');
assert.equal(preview.response.status, 200);
assert.match(preview.value, /<title>My Family \| NYC School Ratings<\/title>/);
assert.match(preview.value, /name="robots" content="noindex, nofollow"/);
assert.equal((await call('/tuck')).response.headers.get('location'), '/family');
assert.equal((await call('/api/tuck/overview')).response.status, 401);
assert.equal((await call('/api/tuck/whatsapp')).response.status, 401);
// Real secret stays inside the Worker. This deliberately unsigned request must fail.
const unsigned = await fetch(base + '/api/parent/whatsapp/inbound', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'Body=HELP' });
assert.equal(unsigned.status, 403, 'Configured receiver rejects unsigned traffic');
const plans = (await call('/api/plans')).value;
assert.equal(plans.researchPass.amount, 2900);
assert.equal(plans.familyPremium.amount, 1999);
assert.equal(plans.familyPremium.available, false);
assert.equal((await call('/api/checkout/guest', undefined, 'POST', { mode: 'subscription' })).response.status, 403, 'Staging must block all checkout');
try {
  for (const account of identities) {
    const registered = await call('/api/register', account, 'POST', { email: account.email, password: account.password, firstName: 'Synthetic Tuck check' });
    assert.equal(registered.response.status, 201);
    assert.ok(account.cookie);
    const access = (await call('/api/subscription', account)).value.access;
    assert.equal(access.research, false);
    assert.equal(access.researchPass.active, false);
    assert.equal(access.familyPremium.active, false);
    assert.equal(access.parentAssistant, false);
    assert.equal((await call('/api/subscription-status', account)).value.isSubscribed, false);
    assert.equal((await call('/api/tuck/household', account, 'POST')).response.status, 200);
    const wa = await call('/api/tuck/whatsapp', account);
    assert.equal(wa.value.preview, true);
    assert.equal(wa.value.configured, true);
    assert.equal(wa.value.connected, false);
    assert.equal((await call('/api/tuck/whatsapp/link', account, 'POST', { consent: false })).response.status, 400);
    assert.equal((await call('/api/tuck/whatsapp/link', account, 'POST', { consent: true }, 'https://other.invalid')).response.status, 403);
    const link = await call('/api/tuck/whatsapp/link', account, 'POST', { consent: true });
    assert.equal(link.response.status, 200);
    assert.equal(link.response.headers.get('cache-control'), 'no-store');
    assert.match(link.value.url, /^https:\/\/wa.me\/19174730386\?text=LINK%20[a-f0-9]{48}$/);
    // Never print or send this synthetic account's bearer link.
    assert.equal((await call('/api/tuck/whatsapp/disconnect', account, 'POST')).response.status, 204);
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
