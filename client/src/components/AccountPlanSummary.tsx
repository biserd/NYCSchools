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
    {(researchPass.active || researchPass.expiresAt) && <p className="text-sm"><strong>Legacy School Research Pass:</strong> {researchPass.active ? 'Active · Grandfathered' : 'Expired'}{researchPass.expiresAt && ` · Original expiry: ${new Date(researchPass.expiresAt).toLocaleDateString()}`}. No automatic renewal. Original benefits unchanged.</p>}
    {legacyRecurring && <p className="text-sm"><strong>Legacy paid plan:</strong> Active · Grandfathered. Your existing price, benefits and billing terms remain unchanged.</p>}
    <p className="text-sm"><strong>Family Premium:</strong> {familyPremium.active ? `Active${familyPremium.cancelAtPeriodEnd ? ' · Ends after the current paid period' : ''}` : 'Not active'}{familyPremium.currentPeriodEnd&&` · Period ends ${new Date(familyPremium.currentPeriodEnd).toLocaleDateString()}`}. {data.access.parentAssistantAvailable?'Configure your assistant in My Family.':'WhatsApp Parent Assistant is coming soon.'}</p>
    <p className="text-sm text-muted-foreground">Existing paid plans are not automatically migrated. A separately purchased monthly subscription does not replace or extend an existing Pass.</p>
    <Link href="/pricing" className="inline-block underline text-sm py-2">View Family Premium pricing</Link>
  </section>;
}
