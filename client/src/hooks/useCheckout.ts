import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProductData {
  data: Array<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    metadata: Record<string, string>;
    prices: Array<{
      id: string;
      unit_amount: number;
      currency: string;
      recurring: { interval: string } | null;
      active: boolean;
    }>;
  }>;
}

export function useCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: products, isLoading: productsLoading } = useQuery<ProductData>({
    queryKey: ["/api/products"],
    staleTime: 1000 * 60 * 5,
  });

  const { data: subscription } = useQuery<{
    status: string;
    plan: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  // Authenticated user checkout
  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, mode }: { priceId: string; mode: 'subscription' | 'payment' }) => {
      const res = await apiRequest("POST", "/api/checkout", { priceId, mode });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Guest checkout (no login required)
  const guestCheckoutMutation = useMutation({
    mutationFn: async ({ priceId, mode }: { priceId: string; mode: 'subscription' | 'payment' }) => {
      const res = await apiRequest("POST", "/api/checkout/guest", { priceId, mode });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Find the Season Pass product/price - use the LAST match to prefer test mode products
  // (Test mode products are synced after live mode products due to the recent key switch)
  const allSeasonPassProducts = products?.data?.filter(p => 
    p.name?.toLowerCase().includes("season") || 
    p.metadata?.plan === "season_pass"
  ) || [];
  const seasonPassProduct = allSeasonPassProducts[allSeasonPassProducts.length - 1];
  const seasonPassPrice = seasonPassProduct?.prices?.find(p => !p.recurring && p.active);

  // New checkout is intentionally one non-renewing offer. Legacy monthly
  // subscribers retain access, but a missing Season Pass must not silently
  // turn a one-time CTA into a recurring subscription.
  const currentPrice = seasonPassPrice;
  const isSeasonPass = true;

  // Check for premium access - includes recurring subscriptions and Season Pass
  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");

  const startCheckout = () => {
    // Wait for products to load before showing error
    if (productsLoading) {
      return;
    }

    // Products loaded but price not found - show error
    if (!currentPrice) {
      toast({
        title: "Error",
        description: "Unable to load pricing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const mode = 'payment' as const;

    // If authenticated, check premium status and use authenticated checkout
    if (user) {
      if (isPremium) {
        toast({
          title: "Access already active",
          description: "You already have full NYC School Ratings access.",
        });
        return;
      }
      checkoutMutation.mutate({ priceId: currentPrice.id, mode });
    } else {
      // Guest checkout - no login required, Stripe collects email
      guestCheckoutMutation.mutate({ priceId: currentPrice.id, mode });
    }
  };

  return {
    startCheckout,
    isLoading: productsLoading || checkoutMutation.isPending || guestCheckoutMutation.isPending,
    isPending: checkoutMutation.isPending || guestCheckoutMutation.isPending,
    isReady: !productsLoading && !!currentPrice,
    isPremium,
    priceAmount: currentPrice?.unit_amount ? (currentPrice.unit_amount / 100).toFixed(0) : "29",
    isSeasonPass,
  };
}
