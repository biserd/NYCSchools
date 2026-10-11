import type Stripe from 'stripe';

export type FunnelAttribution = {
  placement?: string;
  first_landing_path?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

const fields = ['placement', 'first_landing_path', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

// Campaign values are untrusted browser input. Never forward arbitrary fields,
// email addresses, full URLs, or anything that resembles personal information.
export function cleanFunnelAttribution(input: unknown): FunnelAttribution {
  if (!input || typeof input !== 'object') return {};
  const source = input as Record<string, unknown>;
  const clean: FunnelAttribution = {};
  for (const field of fields) {
    const value = source[field];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim().slice(0, 100);
    if (!trimmed || /[@?#]|https?:|\b(?:email|phone|token)\b/i.test(trimmed)) continue;
    if (field === 'first_landing_path' ? /^\/[a-z0-9/_-]*$/i.test(trimmed) : /^[a-z0-9 _./-]+$/i.test(trimmed)) clean[field] = trimmed;
  }
  return clean;
}

export async function recordCheckoutSession(db: D1Database, session: Stripe.Checkout.Session, channel: 'guest' | 'account', attribution: FunnelAttribution) {
  await db.prepare(`INSERT INTO subscription_funnel_sessions
    (stripe_session_id,created_at,channel,placement,first_landing_path,utm_source,utm_medium,utm_campaign,utm_content,utm_term,amount_cents,currency)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(stripe_session_id) DO NOTHING`)
    .bind(session.id, session.created * 1000, channel, attribution.placement || 'unknown', attribution.first_landing_path || null,
      attribution.utm_source || null, attribution.utm_medium || null, attribution.utm_campaign || null,
      attribution.utm_content || null, attribution.utm_term || null, session.amount_total ?? null, session.currency || null).run();
}

export async function confirmPaidCheckout(db: D1Database, session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' || session.metadata?.plan !== 'family_premium') return;
  const attribution = cleanFunnelAttribution(session.metadata);
  const channel = session.metadata?.source === 'guest_checkout' ? 'guest' : 'account';
  await db.prepare(`INSERT INTO subscription_funnel_sessions
    (stripe_session_id,created_at,confirmed_paid_at,channel,placement,first_landing_path,utm_source,utm_medium,utm_campaign,utm_content,utm_term,amount_cents,currency)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(stripe_session_id) DO UPDATE SET
    confirmed_paid_at=COALESCE(subscription_funnel_sessions.confirmed_paid_at,excluded.confirmed_paid_at),
    amount_cents=excluded.amount_cents,currency=excluded.currency`)
    .bind(session.id,session.created * 1000,Date.now(),channel,attribution.placement || 'unknown',attribution.first_landing_path || null,
      attribution.utm_source || null,attribution.utm_medium || null,attribution.utm_campaign || null,
      attribution.utm_content || null,attribution.utm_term || null,session.amount_total ?? null,session.currency || null).run();
}
