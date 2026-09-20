import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import type { AccountAccess } from '@shared/plans';
export function AccountPlanSummary() {
  const { data } = useQuery<{ access: AccountAccess }>({ queryKey: ['/api/subscription'] });
  if (!data?.access) return null;
  const { researchPass, familyPremium } = data.access;
  const legacyRecurring = data.access.research && !researchPass.active && !familyPremium.active;
  return <section className="rounded-lg border p-4 space-y-3 my-4" aria-label="Your plan benefits">
    <h3 className="font-semibold">Your plans</h3>
    {(researchPass.active || researchPass.expiresAt) && <p className="text-sm"><strong>Legacy School Research Pass:</strong> {researchPass.active ? 'Active · Grandfathered' : 'Expired'}{researchPass.expiresAt && ` · Original expiry: ${new Date(researchPass.expiresAt).toLocaleDateString()}`}. No automatic renewal.{researchPass.active&&data.access.parentAssistant?' Parent Assistant is included through this expiry at no extra charge.':''}</p>}
    {legacyRecurring && <p className="text-sm"><strong>Legacy paid plan:</strong> Active · Grandfathered. Your existing price and billing terms remain unchanged; Parent Assistant is included while the plan is active.</p>}
    <p className="text-sm"><strong>Family Premium monthly:</strong> {familyPremium.active ? `Active${familyPremium.cancelAtPeriodEnd ? ' · Ends after the current paid period' : ''}` : 'Not active'}{familyPremium.currentPeriodEnd&&` · Period ends ${new Date(familyPremium.currentPeriodEnd).toLocaleDateString()}`}.</p>
    <p className="text-sm"><strong>Parent Assistant:</strong> {data.access.parentAssistant?'Included with your active paid plan. Configure it in My Family.':data.access.parentAssistantAvailable?'Available with an active paid plan.':'Coming soon.'}</p>
    <p className="text-sm text-muted-foreground">Existing paid plans are not automatically migrated. A separately purchased monthly subscription does not replace or extend an existing Pass.</p>
    <Link href="/pricing" className="inline-block underline text-sm py-2">View Family Premium pricing</Link>
  </section>;
}
