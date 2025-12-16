import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  // Find the Season Pass product/price first
  const seasonPassProduct = products?.data?.find(p => 
    p.name?.toLowerCase().includes("season") || 
    p.metadata?.plan === "season_pass"
  );
  const seasonPassPrice = seasonPassProduct?.prices?.find(p => !p.recurring && p.active);

  // Fallback to premium monthly if Season Pass not found
  const premiumProduct = products?.data?.find(p => 
    p.name?.toLowerCase().includes("premium") || 
    p.name?.toLowerCase().includes("pro") || 
    p.metadata?.plan === "premium"
  );
  const monthlyPrice = premiumProduct?.prices?.find(p => p.recurring?.interval === "month" && p.active);

  // Prefer Season Pass, fallback to monthly
  const currentPrice = seasonPassPrice || monthlyPrice;
  const isSeasonPass = !!seasonPassPrice;

  // Check for premium access - includes recurring subscriptions and Season Pass
  const isPremium = subscription?.status === "active" && 
    (subscription?.plan === "premium" || subscription?.plan === "season_pass");

  const startCheckout = () => {
    // Wait for auth to load
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!user) {
      const currentPath = window.location.pathname;
      setLocation(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Already premium - show friendly message
    if (isPremium) {
      toast({
        title: "Already Premium",
        description: "You already have an active Premium subscription.",
      });
      return;
    }

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

    // Season Pass uses 'payment' mode, monthly uses 'subscription' mode
    const mode = isSeasonPass ? 'payment' : 'subscription';
    checkoutMutation.mutate({ priceId: currentPrice.id, mode });
  };

  return {
    startCheckout,
    isLoading: authLoading || productsLoading || checkoutMutation.isPending,
    isPending: checkoutMutation.isPending,
    isReady: !authLoading && !productsLoading && !!currentPrice,
    isPremium,
    priceAmount: currentPrice?.unit_amount ? (currentPrice.unit_amount / 100).toFixed(0) : "29",
    isSeasonPass,
  };
}
