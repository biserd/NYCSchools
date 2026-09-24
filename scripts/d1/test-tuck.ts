import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import express from 'express';
import { createDatabase, withDatabaseInstance } from '../../server/db';
import { tuckRouter } from '../../server/tuck/routes';

// Local D1 only. Synthetic authentication avoids live users, email and provider APIs.
const platform = await getPlatformProxy<Env>({ configPath: 'wrangler.d1-test.jsonc', persist: { path: await mkdtemp(join(tmpdir(), 'nyc-tuck-')) } });
const binding = platform.env.DB;
let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
try {
  for (const file of (await readdir('migrations-d1')).filter(f => f.endsWith('.sql')).sort()) {
    for (const statement of (await readFile(`migrations-d1/${file}`, 'utf8')).split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await binding.prepare(statement).run();
  }
  await binding.prepare("INSERT INTO users(id,email,password) VALUES ('parent-a','a@example.invalid','test'),('parent-b','b@example.invalid','test')").run();
  await binding.prepare("INSERT INTO schools(dbn,name,district,address,grade_band) VALUES ('02M234','Test School',2,'Test address','K-5')").run();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'session', { value: { userId: req.get('X-Test-User') } });
    void withDatabaseInstance(createDatabase(binding), async () => next()).catch(next);
  });
  const origin = 'https://ratings.example.invalid';
  app.use('/api/tuck', tuckRouter((req, res, next) => req.session.userId ? next() : void res.sendStatus(401), () => origin,
    async () => ({ DB: binding, ENVIRONMENT: 'staging', APP_URL: origin, STAGING_EXPIRES_AT: new Date(Date.now() + 86400000).toISOString(),
      PARENT_WHATSAPP_ENABLED: 'true', TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'synthetic-only',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+12125550101' })));
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/tuck`;
  const request = (path: string, user = 'parent-a', method = 'GET', body?: unknown, requestOrigin: string | null = origin) => fetch(`${base}/${path}`, {
    method, headers: { ...(user ? { 'X-Test-User': user } : {}), ...(requestOrigin ? { Origin: requestOrigin } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal((await request('overview', '')).status, 401);
  assert.equal((await request('overview', 'parent-a', 'GET', undefined, 'https://other.invalid')).status, 403);
  assert.equal((await request('household', 'parent-a', 'POST', undefined, null)).status, 403);
  assert.equal((await request('whatsapp', '')).status, 401);
  assert.equal((await request('whatsapp/link', 'parent-a', 'POST', { consent: true }, null)).status, 403);
  assert.equal((await request('whatsapp/link', 'parent-a', 'POST', { consent: true }, 'https://other.invalid')).status, 403);
  assert.equal((await request('whatsapp/link', 'parent-a', 'POST', { consent: false })).status, 400);
  const wa = await request('whatsapp/link', 'parent-a', 'POST', { consent: true });
  assert.equal(wa.status, 200);
  assert.equal(wa.headers.get('cache-control'), 'private, no-store');
  assert.match((await wa.json()).url, /^https:\/\/wa.me\//);
  assert.equal((await (await request('whatsapp', 'parent-b')).json()).connected, false);
  assert.equal((await request('whatsapp/disconnect', 'parent-b', 'POST')).status, 204);
  assert.ok(await binding.prepare("SELECT token_hash FROM parent_whatsapp_links WHERE user_id='parent-a'").first('token_hash'), 'Other account cannot revoke token');
  const empty = await request('overview');
  assert.equal(empty.headers.get('cache-control'), 'private, no-store');
  const opened = (await empty.json()).household;
  assert.ok(opened?.id, 'The first Family visit opens a private calendar without a setup step');
  assert.equal(await binding.prepare('SELECT count(*) n FROM tuck_households').first('n'), 1);
  const household = await (await request('household', 'parent-a', 'POST')).json();
  const retry = await (await request('household', 'parent-a', 'POST')).json();
  assert.equal(household.id, retry.id, 'Idempotent onboarding');
  assert.equal(household.id, opened.id);
  await request('household', 'parent-b', 'POST');
  assert.equal((await request('children', 'parent-a', 'POST', { nickname: 'A', householdId: 'injected' })).status, 400);
  assert.equal((await request('children', 'parent-a', 'POST', { nickname: 'A', schoolDbn: '99Z999' })).status, 400);
  const childResponse = await request('children', 'parent-a', 'POST', { nickname: 'Kid A', schoolDbn: '02m234' });
  assert.equal(childResponse.status, 201);
  const child = await childResponse.json();
  assert.equal(child.schoolDbn, '02M234');
  assert.equal((await request('events', 'parent-b', 'POST', { childId: child.id, title: 'Other child', date: '2027-01-01' })).status, 404);
  assert.equal((await request('events', 'parent-a', 'POST', { title: 'Bad date', date: '2027-02-30' })).status, 400);
  assert.equal((await request('events', 'parent-a', 'POST', { title: 'Leap day', date: '2028-02-29' })).status, 201);
  const event = await (await request('events', 'parent-a', 'POST', { childId: child.id, title: 'School visit', date: '2027-03-14', detail: '<script>plain text</script>' })).json();
  assert.equal((await request(`events/${event.id}`, 'parent-b', 'DELETE')).status, 404);
  assert.equal((await request(`children/${child.id}`, 'parent-b', 'DELETE')).status, 404);
  const other = await (await request('overview', 'parent-b')).json();
  assert.deepEqual(other.children, []);
  assert.deepEqual(other.events, []);
  const own = await (await request('overview')).json();
  assert.equal(own.children[0].schoolUrl, '/school/02m234-test-school');
  assert.equal(own.events[0].date, '2027-03-14');
  assert.deepEqual(own.capabilities, { calendar: true, whatsapp: false, automaticReminders: false });
  // Database itself rejects cross-household child links, not just the HTTP layer.
  const b = await (await request('overview', 'parent-b')).json();
  await assert.rejects(() => binding.prepare('INSERT INTO tuck_events(id,household_id,child_id,title,date) VALUES (?,?,?,?,?)').bind('invalid', b.household.id, child.id, 'Bad', '2027-01-01').run());
  assert.equal((await request(`children/${child.id}`, 'parent-a', 'DELETE')).status, 204);
  assert.equal((await (await request('overview')).json()).events.length, 1, 'Child delete only removes that child’s events');
  await binding.prepare("DELETE FROM users WHERE id='parent-a'").run();
  assert.equal(await binding.prepare('SELECT count(*) n FROM tuck_children').first('n'), 0);
  assert.equal(await binding.prepare('SELECT count(*) n FROM tuck_events').first('n'), 0);
  assert.equal(await binding.prepare('SELECT count(*) n FROM schools').first('n'), 1, 'School data remains canonical and untouched');
  console.log('Tuck passed: full migration chain, auth, origin/CSRF, no-store, idempotent onboarding, validation, school linking, account isolation, FK enforcement and deletion cascades.');
} finally {
  if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
  await platform.dispose();
}
