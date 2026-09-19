import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import { parentWhatsappWebhook, PARENT_WEBHOOK_PATH, parentWhatsappReady, verifyTwilioSignature, type ParentWhatsappEnvironment } from '../../server/parent/whatsapp';
import { createParentWhatsappLink, disconnectParentWhatsapp, parentWhatsappStatus } from '../../server/parent/account';

const platform = await getPlatformProxy<Env>({ configPath: 'wrangler.d1-test.jsonc', persist: { path: await mkdtemp(join(tmpdir(), 'nyc-parent-whatsapp-')) } });
try {
  const db = platform.env.DB;
  for (const file of (await readdir('migrations-d1')).filter(file => file.endsWith('.sql')).sort()) {
    for (const statement of (await readFile(`migrations-d1/${file}`, 'utf8')).split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  const env: ParentWhatsappEnvironment = { DB: db, ENVIRONMENT: 'staging', APP_URL: 'https://staging.example.invalid',
    STAGING_EXPIRES_AT: new Date(Date.now() + 86400000).toISOString(), PARENT_WHATSAPP_ENABLED: 'true',
    TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'synthetic-only-not-a-provider-credential',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+12125550101' };
  const testPhone = 'whatsapp:+12125550102';
  const url = env.APP_URL + PARENT_WEBHOOK_PATH;
  let sequence = 0;
  function request(body: string, fields: Record<string, string> = {}, signature?: string) {
    const form = new URLSearchParams({ AccountSid: env.TWILIO_ACCOUNT_SID!, To: env.TWILIO_WHATSAPP_FROM!, From: testPhone,
      MessageSid: `SM${(++sequence).toString(16).padStart(32, '0')}`, Body: body, NumMedia: '0', ...fields });
    const signed = url + [...form.keys()].sort().map(key => key + form.get(key)).join('');
    return new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': signature ?? createHmac('sha1', env.TWILIO_AUTH_TOKEN!).update(signed).digest('base64') }, body: form.toString() });
  }
  const send = async (body: string, fields: Record<string, string> = {}) => (await parentWhatsappWebhook(request(body, fields), env)).text();
  const count = () => db.prepare('SELECT count(*) n FROM parent_whatsapp_receipts').first<number>('n');
  assert.equal(parentWhatsappReady(env), true);
  assert.equal(parentWhatsappReady({ ...env, ENVIRONMENT: 'production', STAGING_EXPIRES_AT: undefined }), true);
  assert.equal(parentWhatsappReady({ ...env, ENVIRONMENT: 'production', PARENT_WHATSAPP_ENABLED: 'false' }), false);
  assert.equal(parentWhatsappReady({ ...env, ENVIRONMENT: 'development' }), false);
  assert.equal(parentWhatsappReady({ ...env, STAGING_EXPIRES_AT: 'invalid' }), false);
  assert.equal(parentWhatsappReady({ ...env, TWILIO_AUTH_TOKEN: undefined }), false);
  assert.equal((await parentWhatsappWebhook(request('HELP'), { ...env, TWILIO_AUTH_TOKEN: undefined })).status, 503);
  assert.equal((await parentWhatsappWebhook(new Request(url), env)).status, 405);
  assert.equal((await parentWhatsappWebhook(request('HELP', {}, 'invalid'), env)).status, 403);
  assert.equal(await count(), 0, 'Rejected signatures never write');
  assert.equal((await parentWhatsappWebhook(request('HELP', { To: 'whatsapp:+12125559999' }), env)).status, 403);
  assert.equal((await parentWhatsappWebhook(request('HELP', { AccountSid: `AC${'b'.repeat(32)}` }), env)).status, 403);
  assert.equal((await parentWhatsappWebhook(request('HELP', { MessageSid: 'bad' }), env)).status, 403);
  assert.match(await send('EVENTS', { From: 'whatsapp:+12125559999' }), /Sign in/, 'Any number can request onboarding, but cannot read private dates');
  assert.equal(await count(), 1);
  const signed = request('HELP', { FutureTwilioField: 'value with spaces & symbols' });
  assert.equal((await parentWhatsappWebhook(signed, env)).status, 200, 'New provider parameters participate in signatures');
  const original = request('HELP');
  const duplicated = new Request(url, { method: 'POST', headers: original.headers, body: (await original.text()) + '&Body=STOP' });
  assert.equal((await parentWhatsappWebhook(duplicated, env)).status, 403);
  assert.equal((await parentWhatsappWebhook(new Request(url + '?override=1', { method: 'POST' }), env)).status, 400);
  assert.equal((await parentWhatsappWebhook(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), env)).status, 415);
  assert.equal((await parentWhatsappWebhook(request('x'.repeat(17000)), env)).status, 413);
  assert.match(await send('HELP', { NumMedia: '1' }), /text only/);
  // Published Twilio validation example (known answer, independent of our signer).
  assert.equal(await verifyTwilioSignature('https://example.com/myapp.php?foo=1&bar=2', new URLSearchParams({ CallSid: 'CA1234567890ABCDE', Caller: '+14158675310', Digits: '1234', From: '+14158675310', To: '+18005551212' }), 'L/OH5YylLD5NRKLltdqwSvS0BnU=', '12345'), true);

  await db.prepare("INSERT INTO users(id,email,password) VALUES ('wa-parent-a','wa-a@example.invalid','test'),('wa-parent-b','wa-b@example.invalid','test')").run();
  await db.prepare("INSERT INTO tuck_households(id,owner_user_id) VALUES ('house-a','wa-parent-a'),('house-b','wa-parent-b')").run();
  await db.prepare("INSERT INTO tuck_events(id,household_id,title,date) VALUES ('event-a','house-a','Visit <school> & ask questions','2099-01-01'),('event-b','house-b','OTHER PARENT SECRET','2099-01-01')").run();
  await assert.rejects(() => createParentWhatsappLink('wa-parent-a', env, false), /Confirm/);
  const link = await createParentWhatsappLink('wa-parent-a', env, true);
  const command = new URL(link.url).searchParams.get('text')!;
  assert.match(link.url, /^https:\/\/wa.me\/12125550101\?/);
  const stored = await db.prepare("SELECT token_hash FROM parent_whatsapp_links WHERE user_id='wa-parent-a'").first<string>('token_hash');
  assert.equal(stored?.length, 64);
  assert.ok(!stored?.includes(command.slice(5)), 'No raw token storage');
  await assert.rejects(() => createParentWhatsappLink('wa-parent-a', env, true), /wait one minute/);
  const linkRequest = request(command);
  assert.match(await (await parentWhatsappWebhook(linkRequest.clone(), env)).text(), /Connected to NYC School Ratings preview/);
  assert.equal(await (await parentWhatsappWebhook(linkRequest.clone(), env)).text(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  assert.match(await send(command), /expired, already used/);
  assert.equal((await parentWhatsappStatus('wa-parent-a', env)).connected, true);
  assert.equal((await parentWhatsappStatus('wa-parent-b', env)).connected, false);
  assert.equal((await parentWhatsappStatus('wa-parent-a', env)).phone, '••••0102');
  const dates = await send('EVENTS');
  assert.match(dates, /Visit &lt;school&gt; &amp; ask questions/);
  assert.ok(!dates.includes('OTHER PARENT SECRET'), 'Cross-account calendar isolation');
  const bLink = await createParentWhatsappLink('wa-parent-b', env, true);
  assert.match(await send(new URL(bLink.url).searchParams.get('text')!), /already linked/);
  assert.equal((await parentWhatsappStatus('wa-parent-b', env)).connected, false, 'Phone cannot be silently moved to another account');
  await disconnectParentWhatsapp('wa-parent-b', env);
  assert.equal((await parentWhatsappStatus('wa-parent-a', env)).connected, true, 'Disconnect scoped to owner');
  const stop = request('anything', { OptOutType: 'STOP' });
  assert.equal(await (await parentWhatsappWebhook(stop.clone(), env)).text(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  assert.equal((await parentWhatsappStatus('wa-parent-a', env)).connected, false);
  await send('START');
  assert.equal((await parentWhatsappStatus('wa-parent-a', env)).connected, false, 'START never restores consent');
  assert.ok(!(await send('EVENTS')).includes('Visit'), 'Disconnected phones cannot read dates');
  await db.prepare("UPDATE parent_whatsapp_links SET token_issued_at=0 WHERE user_id='wa-parent-a'").run();
  const expired = await createParentWhatsappLink('wa-parent-a', env, true);
  await db.prepare("UPDATE parent_whatsapp_links SET token_expires_at=0 WHERE user_id='wa-parent-a'").run();
  assert.match(await send(new URL(expired.url).searchParams.get('text')!), /expired/);
  // Daily cap doesn't prevent opt-out.
  for (let i = 0; i < 55; i++) await send('HELP');
  assert.equal(await count(), 50);
  await db.prepare("UPDATE parent_whatsapp_links SET phone=?,consent_at=? WHERE user_id='wa-parent-a'").bind(testPhone, Date.now()).run();
  await send('STOP');
  assert.equal((await parentWhatsappStatus('wa-parent-a', env)).connected, false);
  await db.prepare("DELETE FROM users WHERE id='wa-parent-a'").run();
  assert.equal(await db.prepare("SELECT count(*) n FROM parent_whatsapp_links WHERE user_id='wa-parent-a'").first('n'), 0);
  // Production uses its own canonical URL and DB; no staging-expiry dependency.
  const production = { ...env, ENVIRONMENT: 'production', APP_URL: 'https://nycschoolsratings.com', STAGING_EXPIRES_AT: undefined };
  await db.prepare("UPDATE parent_whatsapp_links SET token_issued_at=0 WHERE user_id='wa-parent-b'").run();
  const productionLink = await createParentWhatsappLink('wa-parent-b', production, true);
  const productionForm = new URLSearchParams({ AccountSid: env.TWILIO_ACCOUNT_SID!, To: env.TWILIO_WHATSAPP_FROM!, From: 'whatsapp:+12125550103', MessageSid: `SM${'f'.repeat(32)}`, Body: new URL(productionLink.url).searchParams.get('text')!, NumMedia: '0' });
  // Reset only synthetic local receipt history for the independent environment test.
  await db.prepare('DELETE FROM parent_whatsapp_receipts').run();
  const productionUrl = production.APP_URL + PARENT_WEBHOOK_PATH;
  const productionSignature = createHmac('sha1', env.TWILIO_AUTH_TOKEN!).update(productionUrl + [...productionForm.keys()].sort().map(key => key + productionForm.get(key)).join('')).digest('base64');
  const productionRequest = new Request(productionUrl, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': productionSignature}, body: productionForm.toString()});
  assert.match(await (await parentWhatsappWebhook(productionRequest, production)).text(), /Connected/);
  assert.equal((await parentWhatsappStatus('wa-parent-b', production)).connected, true);
  await disconnectParentWhatsapp('wa-parent-b', production);
  assert.equal((await parentWhatsappStatus('wa-parent-b', production)).connected, false);
  console.log('Parent WhatsApp passed: migration chain, signature known-vector, URL/account/recipient checks, body bounds, token hashing/expiry/single use, replay suppression, rate limit, XML escaping, calendar isolation, STOP, no START re-enrollment and deletion cascade. No real messages sent.');
} finally { await platform.dispose(); }
