import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCheckout } from "@/hooks/useCheckout";
import {
  Zap,
  Star,
  Check,
  MessageCircle,
  Clock,
  Target,
  TrendingUp,
  Loader2,
  Shield,
  Sparkles,
  Heart,
  Brain,
} from "lucide-react";

export type UpgradeModalTrigger = 
  | "favorites_limit" 
  | "ai_chat_limit" 
  | "comparison_limit" 
  | "commute_locked" 
  | "recommendations_locked"
  | "general";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: UpgradeModalTrigger;
}

const triggerContent: Record<UpgradeModalTrigger, { title: string; description: string; icon: typeof Star }> = {
  favorites_limit: {
    title: "Save Unlimited Schools",
    description: "You've reached the free limit of 5 favorites. Upgrade to save unlimited schools and never lose track of your top picks.",
    icon: Heart,
  },
  ai_chat_limit: {
    title: "Unlimited AI Questions",
    description: "You've used your 5 free questions today. Upgrade for unlimited access to our AI assistant who knows everything about NYC schools.",
    icon: MessageCircle,
  },
  comparison_limit: {
    title: "Compare More Schools",
    description: "Free users can compare 2 schools. Upgrade to compare up to 4 schools side-by-side for a complete picture.",
    icon: TrendingUp,
  },
  commute_locked: {
    title: "Unlock Commute Calculator",
    description: "See exact travel times from your home to any school. Know your daily commute before you commit.",
    icon: Clock,
  },
  recommendations_locked: {
    title: "Get Smart Recommendations",
    description: "Tell us what matters to you and let our AI find schools that match your family's unique needs.",
    icon: Target,
  },
  general: {
    title: "Get the Enrollment Season Pass",
    description: "Unlock six months of comparison, planning, and application tools with one payment and no renewal.",
    icon: Sparkles,
  },
};

export function UpgradeModal({ open, onOpenChange, trigger = "general" }: UpgradeModalProps) {
  const { startCheckout, isPending, priceAmount, isReady } = useCheckout();
  const content = triggerContent[trigger];
  const IconComponent = content.icon;

  const priceLabel = "one-time";
  const priceDescription = "6 months of full access · no automatic renewal";
  const badgeText = "Enrollment Season Pass";
  const buttonText = "Get Season Pass";

  const premiumFeatures = [
    { icon: MessageCircle, text: "Unlimited AI questions" },
    { icon: Clock, text: "Commute time calculator" },
    { icon: Target, text: "Smart recommendations" },
    { icon: Brain, text: "Early childhood insights" },
    { icon: Heart, text: "Unlimited favorites" },
    { icon: TrendingUp, text: "Historical trends" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-upgrade">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl" data-testid="modal-upgrade-title">{content.title}</DialogTitle>
          <DialogDescription className="text-center">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Price */}
          <div className="text-center mb-4">
            <Badge variant="secondary" className="mb-2">
              <Zap className="w-3 h-3 mr-1" />
              {badgeText}
            </Badge>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">${priceAmount}</span>
              <span className="text-muted-foreground">{priceLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{priceDescription}</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {premiumFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Secure
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              No renewal
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            className="w-full" 
            onClick={startCheckout}
            disabled={isPending || !isReady}
            data-testid="button-modal-upgrade"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {buttonText}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground" 
            onClick={() => onOpenChange(false)}
            data-testid="button-modal-close"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy use in components
import { useState, useCallback } from "react";

export function useUpgradeModal() {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<UpgradeModalTrigger>("general");

  const showUpgradeModal = useCallback((triggerType: UpgradeModalTrigger = "general") => {
    setTrigger(triggerType);
    setOpen(true);
  }, []);

  const UpgradeModalComponent = useCallback(() => (
    <UpgradeModal open={open} onOpenChange={setOpen} trigger={trigger} />
  ), [open, trigger]);

  return {
    showUpgradeModal,
    UpgradeModal: UpgradeModalComponent,
    isOpen: open,
    setOpen,
  };
}
