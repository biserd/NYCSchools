import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import type Stripe from 'stripe';
import { cleanFunnelAttribution, confirmPaidCheckout, recordCheckoutSession } from '../../server/parent/funnel';

const platform = await getPlatformProxy<Env>({configPath:'wrangler.d1-test.jsonc',persist:{path:await mkdtemp(join(tmpdir(),'nyc-funnel-'))}});
try {
  for (const file of (await readdir('migrations-d1')).filter(file=>file.endsWith('.sql')).sort()) {
    for (const statement of (await readFile(`migrations-d1/${file}`,'utf8')).split('--> statement-breakpoint').map(part=>part.trim()).filter(Boolean)) await platform.env.DB.prepare(statement).run();
  }
  assert.deepEqual(cleanFunnelAttribution({placement:'comparison_gate',utm_source:'newsletter',utm_campaign:'parent@example.com',first_landing_path:'/school/02m422?token=x'}),{placement:'comparison_gate',utm_source:'newsletter'});
  const session={id:'cs_test_funnel1234567890',created:1750000000,amount_total:999,currency:'usd',payment_status:'unpaid',metadata:{plan:'family_premium',source:'guest_checkout',placement:'comparison_gate',utm_source:'newsletter'}} as unknown as Stripe.Checkout.Session;
  await recordCheckoutSession(platform.env.DB,session,'guest',{placement:'comparison_gate',utm_source:'newsletter'});
  await recordCheckoutSession(platform.env.DB,session,'guest',{placement:'comparison_gate',utm_source:'newsletter'});
  await confirmPaidCheckout(platform.env.DB,session);
  let row=await platform.env.DB.prepare('SELECT * FROM subscription_funnel_sessions WHERE stripe_session_id=?').bind(session.id).first<{confirmed_paid_at:number|null;channel:string;placement:string;utm_source:string}>();
  assert.equal(row?.confirmed_paid_at,null,'A Checkout return or unpaid event must not count as paid');
  assert.equal(row?.channel,'guest');
  assert.equal(row?.placement,'comparison_gate');
  assert.equal(row?.utm_source,'newsletter');
  await confirmPaidCheckout(platform.env.DB,{...session,payment_status:'paid'});
  row=await platform.env.DB.prepare('SELECT * FROM subscription_funnel_sessions WHERE stripe_session_id=?').bind(session.id).first();
  const firstConfirmed=row?.confirmed_paid_at;
  assert.equal(typeof firstConfirmed,'number');
  await confirmPaidCheckout(platform.env.DB,{...session,payment_status:'paid'});
  row=await platform.env.DB.prepare('SELECT * FROM subscription_funnel_sessions WHERE stripe_session_id=?').bind(session.id).first();
  assert.equal(row?.confirmed_paid_at,firstConfirmed,'Webhook retries must not double-count');
  assert.equal(await platform.env.DB.prepare('SELECT count(*) AS count FROM subscription_funnel_sessions').first<number>('count'),1);
  console.log('Subscription funnel passed: migration, attribution hygiene, session idempotence, paid-only confirmation and webhook retry.');
} finally {
  await platform.dispose();
}
