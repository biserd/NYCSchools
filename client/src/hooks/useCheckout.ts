import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { FAMILY_PREMIUM, type AccountAccess } from '@shared/plans';

// Only explicit monthly checkout creates new purchases. Retired Pass endpoints
// never silently turn an old one-time offer into a recurring charge.
export function useCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const plans = useQuery<{ familyPremium: { available: boolean; guestAvailable: boolean; stagingTestEmailRequired?: boolean } }>({ queryKey: ['/api/plans'] });
  const subscription = useQuery<{ access: AccountAccess }>({ queryKey: ['/api/subscription'], enabled: !!user });
  const isReady = plans.data?.familyPremium.available === true;
  const guestReady = plans.data?.familyPremium.guestAvailable === true;
  const stagingTestEmailRequired = plans.data?.familyPremium.stagingTestEmailRequired === true;
  const monthlyActive = subscription.data?.access.familyPremium.active === true;
  const assistantActive = subscription.data?.access.parentAssistant === true;
  const checkout = useMutation({
    mutationFn: async (testEmail?: string) => {
      const result = await (await apiRequest('POST', user ? '/api/tuck/family-checkout' : '/api/family/checkout/guest', !user && testEmail ? { testEmail } : undefined)).json();
      if (new URL(result.url).origin !== 'https://checkout.stripe.com') throw new Error('Unexpected checkout destination.');
      window.location.href = result.url;
    },
    onError: (error: Error) => toast({ title: 'Checkout unavailable', description: error.message, variant: 'destructive' }),
  });
  const startCheckout = (testEmail?: unknown) => {
    if (checkout.isPending) return;
    if (!isReady) { window.location.href = '/pricing'; return; }
    if (!user && !guestReady) { window.location.href = '/pricing#checkout'; toast({ title: 'Guest checkout unavailable', description: 'We cannot take payment until email sign-in links can be delivered.', variant: 'destructive' }); return; }
    if (!user && stagingTestEmailRequired && typeof testEmail !== 'string') { window.location.href = '/pricing#checkout'; return; }
    if (assistantActive) { window.location.href = '/family'; return; }
    trackEvent('begin_checkout', { currency: 'USD', value: FAMILY_PREMIUM.amount / 100, checkout_type: 'monthly' });
    checkout.mutate(typeof testEmail === 'string' ? testEmail : undefined);
  };
  return {
    startCheckout, isLoading: plans.isLoading || checkout.isPending,
    isPending: checkout.isPending, isReady, guestReady, stagingTestEmailRequired, isSignedIn: !!user, monthlyActive, assistantActive,
    isPremium: subscription.data?.access.research === true,
    priceAmount: (FAMILY_PREMIUM.amount / 100).toFixed(2), isSeasonPass: false,
  };
}
