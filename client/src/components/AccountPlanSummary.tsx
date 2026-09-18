import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import type { AccountAccess } from '@shared/plans';
export function AccountPlanSummary() {
  const { data } = useQuery<{ access: AccountAccess }>({ queryKey: ['/api/subscription'] });
  if (!data?.access) return null;
  const { researchPass, familyPremium } = data.access;
  return <section className="rounded-lg border p-4 space-y-3 my-4" aria-label="Your separate plan benefits">
    <h3 className="font-semibold">Your plans</h3>
    <p className="text-sm"><strong>School Research Pass:</strong> {researchPass.active ? 'Active' : researchPass.expiresAt ? 'Expired' : 'Not purchased'}{researchPass.expiresAt && ` · Original expiry: ${new Date(researchPass.expiresAt).toLocaleDateString()}`}. No automatic renewal.</p>
    <p className="text-sm"><strong>Family Premium:</strong> {familyPremium.active ? `Active${familyPremium.cancelAtPeriodEnd ? ' · Ends after the current paid period' : ''}` : 'Not active'}. WhatsApp Parent Assistant is coming soon.</p>
    <p className="text-sm text-muted-foreground">A monthly upgrade does not replace or extend an existing Pass. After monthly access ends, an unexpired Pass remains valid through its original expiry.</p>
    <Link href="/pricing" className="inline-block underline text-sm py-2">Compare the two plans</Link>
  </section>;
}
