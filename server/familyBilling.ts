import { desc, eq, sql } from 'drizzle-orm';
import { familySubscriptions, type User } from '@shared/schema';
import { FAMILY_PREMIUM, resolveAccess } from '@shared/plans';
import type Stripe from 'stripe';
import { db } from './db';

export async function accountAccess(user: User) {
  const rows = await db.select().from(familySubscriptions).where(eq(familySubscriptions.userId, user.id)).orderBy(desc(familySubscriptions.currentPeriodEnd));
  const now = new Date();
  const family = rows.find(row => ['active', 'trialing'].includes(row.status) && row.currentPeriodEnd > now) ?? rows[0] ?? null;
  return resolveAccess(user, family, now, process.env.PARENT_ASSISTANT_ENABLED === 'true');
}

export function matchesFamilyPrice(subscription: Stripe.Subscription, priceId: string | undefined) {
  // The old monthly Price remains attached to existing subscriptions. Never
  // change their billing terms or stop processing their renewal/cancel events.
  const grandfatheredPrices = new Map([
    ['price_1UHTbBRwvWaTf8xfau7pgSYS', 1999], // former live offer
    ['price_1UHTA7RwvWaTf8xfT3VzOnbm', 1999], // former staging offer
  ]);
  return subscription.items.data.some(({ price }) => {
    const expectedAmount = grandfatheredPrices.get(price.id) ?? (price.id === priceId ? FAMILY_PREMIUM.amount : undefined);
    return expectedAmount !== undefined && price.currency === 'usd' && price.unit_amount === expectedAmount &&
      price.recurring?.interval === 'month' && price.recurring.interval_count === 1;
  });
}

export async function recordFamilySubscription(userId: string, subscription: Stripe.Subscription, eventCreated: number, deleted = false) {
  const periodEnd = Math.min(...subscription.items.data.map(item => item.current_period_end));
  if (!Number.isFinite(periodEnd) || periodEnd <= 0) throw new Error('Family subscription has no valid current period');
  const row = { userId, stripeSubscriptionId: subscription.id, status: deleted ? 'canceled' : subscription.status,
    currentPeriodEnd: new Date(periodEnd * 1000), cancelAtPeriodEnd: subscription.cancel_at_period_end, lastEventCreated: eventCreated };
  await db.insert(familySubscriptions).values(row).onConflictDoUpdate({ target: familySubscriptions.stripeSubscriptionId, set: row,
    // Older events cannot restore access; deletion wins ties. Canceled IDs cannot restart.
    setWhere: sql`${familySubscriptions.userId} = ${userId} AND ${familySubscriptions.status} != 'canceled' AND (${familySubscriptions.lastEventCreated} < ${eventCreated} OR (${familySubscriptions.lastEventCreated} = ${eventCreated} AND ${row.status} = 'canceled'))`,
  });
}
