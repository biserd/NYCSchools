// One source for public prices; Stripe's configured offer must match before checkout.
export const RESEARCH_PASS = { id: 'season_pass', name: 'School Research Pass', amount: 2999, currency: 'usd', months: 6 } as const;
export const FAMILY_PREMIUM = { id: 'family_premium', name: 'Family Premium', amount: 1999, currency: 'usd', interval: 'month' } as const;
// Deliberate code-level launch gate: cannot be enabled by a client or billing event.
export const PARENT_ASSISTANT_AVAILABLE = false;

export interface AccessInput {
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: Date | null;
}
export interface FamilyAccessInput { status: string; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean }
export function resolveAccess(user: AccessInput, family: FamilyAccessInput | null, now = new Date()) {
  const passActive = user.subscriptionStatus === 'active' && user.subscriptionPlan === 'season_pass' &&
    (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
  const legacyResearchActive = user.subscriptionStatus === 'active' && user.subscriptionPlan === 'premium' &&
    (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
  const familyActive = !!family && ['active', 'trialing'].includes(family.status) && family.currentPeriodEnd > now;
  return {
    research: passActive || legacyResearchActive || familyActive,
    researchPass: { active: passActive, expiresAt: user.subscriptionPlan === 'season_pass' ? user.subscriptionExpiresAt?.toISOString() ?? null : null },
    familyPremium: { active: familyActive, status: family?.status ?? 'none', currentPeriodEnd: family?.currentPeriodEnd.toISOString() ?? null, cancelAtPeriodEnd: family?.cancelAtPeriodEnd ?? false },
    parentAssistant: familyActive && PARENT_ASSISTANT_AVAILABLE,
    parentAssistantAvailable: PARENT_ASSISTANT_AVAILABLE,
  };
}
export type AccountAccess = ReturnType<typeof resolveAccess>;

// Calendar months, clamped at month end: Aug 31 -> Feb 28/29, not March.
export function sixMonthsFrom(start: Date): Date {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + RESEARCH_PASS.months);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}
