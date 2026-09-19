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
  const plans = useQuery<{ familyPremium: { available: boolean } }>({ queryKey: ['/api/plans'] });
  const subscription = useQuery<{ access: AccountAccess }>({ queryKey: ['/api/subscription'], enabled: !!user });
  const isReady = plans.data?.familyPremium.available === true;
  const monthlyActive = subscription.data?.access.familyPremium.active === true;
  const checkout = useMutation({
    mutationFn: async () => {
      const result = await (await apiRequest('POST', '/api/tuck/family-checkout')).json();
      if (new URL(result.url).origin !== 'https://checkout.stripe.com') throw new Error('Unexpected checkout destination.');
      window.location.href = result.url;
    },
    onError: (error: Error) => toast({ title: 'Checkout unavailable', description: error.message, variant: 'destructive' }),
  });
  const startCheckout = () => {
    if (checkout.isPending) return;
    if (!isReady) { window.location.href = '/pricing'; return; }
    if (!user) { window.location.href = '/login?redirect=/pricing'; return; }
    if (monthlyActive) { window.location.href = '/settings'; return; }
    trackEvent('begin_checkout', { currency: 'USD', value: FAMILY_PREMIUM.amount / 100, checkout_type: 'monthly' });
    checkout.mutate();
  };
  return {
    startCheckout, isLoading: plans.isLoading || checkout.isPending,
    isPending: checkout.isPending, isReady, monthlyActive,
    isPremium: subscription.data?.access.research === true,
    priceAmount: (FAMILY_PREMIUM.amount / 100).toFixed(2), isSeasonPass: false,
  };
}
