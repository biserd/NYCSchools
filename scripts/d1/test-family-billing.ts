import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { createDatabase, withDatabaseInstance } from '../../server/db';
import { accountAccess, matchesFamilyPrice, recordFamilySubscription } from '../../server/familyBilling';
import { users } from '../../shared/schema';
import { resolveAccess, sixMonthsFrom, RESEARCH_PASS, FAMILY_PREMIUM } from '../../shared/plans';

// Synthetic data in a new local D1 database; never calls Stripe or production.
const platform = await getPlatformProxy<Env>({ configPath: 'wrangler.d1-test.jsonc', persist: { path: await mkdtemp(join(tmpdir(), 'nyc-family-billing-')) } });
try {
  for (const file of (await readdir('migrations-d1')).filter(f => f.endsWith('.sql')).sort()) {
    for (const statement of (await readFile(`migrations-d1/${file}`, 'utf8')).split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await platform.env.DB.prepare(statement).run();
  }
  const db = createDatabase(platform.env.DB);
  await withDatabaseInstance(db, async () => {
    const expiry = new Date(Date.now() + 120 * 86400000);
    await db.insert(users).values([{ id: 'pass', email: 'pass@example.invalid', password: 'test', subscriptionStatus: 'active', subscriptionPlan: 'season_pass', subscriptionExpiresAt: expiry }, { id: 'free', email: 'free@example.invalid', password: 'test' }]);
    const read = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];
    const original = await read('pass');
    assert.equal(RESEARCH_PASS.available, false, 'Legacy sales retired, not legacy access');
    assert.equal(FAMILY_PREMIUM.amount, 1999);
    assert.equal((await accountAccess(original)).researchPass.active, true);
    assert.equal(resolveAccess(original, null, new Date(), true).parentAssistant, true, 'Active Pass is grandfathered into Parent Assistant');
    const legacy = { id: 'legacy', email: 'legacy@example.invalid', password: 'test', subscriptionStatus: 'active', subscriptionPlan: 'premium', subscriptionExpiresAt: expiry, stripeSubscriptionId: 'sub_legacy' };
    await db.insert(users).values(legacy);
    const originalLegacy = await read('legacy');
    assert.equal((await accountAccess(originalLegacy)).research, true, 'Grandfathered recurring research retained');
    assert.equal((await accountAccess(originalLegacy)).familyPremium.active, false, 'No forced monthly enrollment');
    assert.equal(resolveAccess(originalLegacy, null, new Date(), true).parentAssistant, true, 'Active legacy paid plan is grandfathered into Parent Assistant');
    const period = Math.floor(Date.now() / 1000) + 30 * 86400;
    const subscription = { id: 'sub_family', status: 'active', cancel_at_period_end: false, items: { data: [{ current_period_end: period, price: { id: 'price_family', currency: 'usd', unit_amount: 1999, recurring: { interval: 'month', interval_count: 1 } } }] } } as unknown as Stripe.Subscription;
    assert.equal(matchesFamilyPrice(subscription, 'price_family'), true);
    assert.equal(matchesFamilyPrice(subscription, 'wrong_price'), false);
    assert.equal(matchesFamilyPrice(subscription, undefined), false);
    assert.equal(matchesFamilyPrice({ ...subscription, items: { ...subscription.items, data: [{ ...subscription.items.data[0], price: { ...subscription.items.data[0].price, unit_amount: 2999 } }] } }, 'price_family'), false);
    assert.equal((await accountAccess(await read('free'))).research, false);
    await recordFamilySubscription('pass', subscription, 10);
    let access = await accountAccess(await read('pass'));
    assert.equal(access.researchPass.active, true);
    assert.equal(access.familyPremium.active, true);
    assert.equal(access.parentAssistant, false);
    await recordFamilySubscription('pass', { ...subscription, cancel_at_period_end: true }, 11);
    assert.equal((await accountAccess(await read('pass'))).familyPremium.active, true, 'Scheduled cancellation retains access until period end');
    await recordFamilySubscription('pass', subscription, 12, true);
    await recordFamilySubscription('pass', subscription, 11);
    await recordFamilySubscription('pass', subscription, 12);
    access = await accountAccess(await read('pass'));
    assert.equal(access.familyPremium.active, false, 'Older/replayed events cannot resurrect canceled membership');
    assert.equal(access.research, true, 'Canceling monthly preserves prepaid research');
    assert.equal(access.researchPass.expiresAt, expiry.toISOString());
    assert.deepEqual(await read('pass'), original, 'Monthly lifecycle must never mutate prepaid purchase fields');
    assert.deepEqual(await read('legacy'), originalLegacy, 'Retirement must not mutate existing recurring accounts');
    await recordFamilySubscription('free', { ...subscription, id: 'sub_monthly_only' }, 20);
    assert.equal((await accountAccess(await read('free'))).research, true);
    await recordFamilySubscription('free', { ...subscription, id: 'sub_monthly_only' }, 21, true);
    assert.equal((await accountAccess(await read('free'))).research, false, 'Monthly payment is not a six-month pass');
    const now = new Date();
    const expired = { ...original, subscriptionExpiresAt: new Date(now.getTime() - 1) };
    assert.equal(resolveAccess(expired, null, now).research, false);
    assert.equal(resolveAccess(expired, null, now, true).parentAssistant, false, 'Expired Pass cannot use Parent Assistant');
    assert.equal(resolveAccess(expired, { status: 'active', currentPeriodEnd: expiry, cancelAtPeriodEnd: false }, now).research, true);
    assert.equal(resolveAccess(expired, { status: 'active', currentPeriodEnd: expiry, cancelAtPeriodEnd: false }, now, true).parentAssistant, true);
    assert.equal(resolveAccess(expired, { status: 'active', currentPeriodEnd: now, cancelAtPeriodEnd: true }, now).research, false);
    assert.equal(sixMonthsFrom(new Date('2026-08-31T12:00:00Z')).toISOString(), '2027-02-28T12:00:00.000Z');
    assert.equal(sixMonthsFrom(new Date('2027-08-31T12:00:00Z')).toISOString(), '2028-02-29T12:00:00.000Z');
  });
  console.log('Family billing passed: migration chain, free/pass/monthly/combined access, cancellation, expiry, stale events, exact price matching, assistant gate and original Pass preservation.');
} finally { await platform.dispose(); }
