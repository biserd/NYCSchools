import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ClipboardList, Check, Lock, Loader2 } from "lucide-react";

interface TrackSchoolButtonProps {
  schoolDbn: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function TrackSchoolButton({ 
  schoolDbn, 
  variant = "outline", 
  size = "default",
  showLabel = false 
}: TrackSchoolButtonProps) {
  const { toast } = useToast();
  const [justTracked, setJustTracked] = useState(false);

  // Check auth status
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  // Check subscription status
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const isPremium = (subscription as any)?.plan === "premium" || (subscription as any)?.plan === "season_pass";

  // Check if school is tracked
  const { data: trackStatus, isLoading: statusLoading } = useQuery<{ isTracked: boolean }>({
    queryKey: ["/api/tracked-schools", schoolDbn],
    enabled: !!user && isPremium,
  });

  const isTracked = trackStatus?.isTracked || justTracked;

  // Track mutation
  const trackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tracked-schools", { schoolDbn });
    },
    onSuccess: () => {
      setJustTracked(true);
      queryClient.invalidateQueries({ queryKey: ["/api/tracked-schools"] });
      toast({ 
        title: "School tracked!", 
        description: "View it in your Application Tracker." 
      });
    },
    onError: (error: any) => {
      if (error?.message?.includes("PREMIUM_REQUIRED")) {
        toast({ 
          title: "Premium Feature", 
          description: "Upgrade to track schools.",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to track school.",
          variant: "destructive"
        });
      }
    },
  });

  // Not logged in
  if (!user) {
    return (
      <Button variant={variant} size={size} asChild data-testid="button-track-login">
        <Link href="/login">
          <ClipboardList className="h-4 w-4" />
          {showLabel && <span className="ml-2">Track</span>}
        </Link>
      </Button>
    );
  }

  // Not premium - show locked state
  if (!isPremium && !subLoading) {
    return (
      <Button variant={variant} size={size} asChild data-testid="button-track-upgrade">
        <Link href="/pricing">
          <Lock className="h-4 w-4" />
          {showLabel && <span className="ml-2">Track</span>}
        </Link>
      </Button>
    );
  }

  // Loading
  if (statusLoading || subLoading) {
    return (
      <Button variant={variant} size={size} disabled data-testid="button-track-loading">
        <Loader2 className="h-4 w-4 animate-spin" />
        {showLabel && <span className="ml-2">Track</span>}
      </Button>
    );
  }

  // Already tracked
  if (isTracked) {
    return (
      <Button variant="outline" size={size} asChild data-testid="button-track-view">
        <Link href="/application-tracker">
          <Check className="h-4 w-4 text-emerald-600" />
          {showLabel && <span className="ml-2">Tracked</span>}
        </Link>
      </Button>
    );
  }

  // Track button
  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={() => trackMutation.mutate()}
      disabled={trackMutation.isPending}
      data-testid="button-track-school"
    >
      {trackMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ClipboardList className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">{trackMutation.isPending ? "Tracking..." : "Track"}</span>}
    </Button>
  );
}
