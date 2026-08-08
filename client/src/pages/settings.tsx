import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MapPin, Save, Settings as SettingsIcon, LogIn, CreditCard, Crown, Loader2, ExternalLink, MessageCircle, Calendar, Lock, Sparkles } from "lucide-react";
import { UserProfile, AiChatSession, AiChatSessionWithMessages } from "@shared/schema";
import { ApiAccessCard } from "@/components/ApiAccessCard";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

interface SubscriptionStatus {
  isSubscribed: boolean;
  subscription: {
    id: string;
    status: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
    plan?: {
      nickname: string;
      amount: number;
      currency: string;
      interval: string;
    };
  } | null;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

// Chat session item component with expandable messages
function ChatSessionItem({ 
  session, 
  isExpanded, 
  onToggle 
}: { 
  session: AiChatSession; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const { data: sessionWithMessages, isLoading } = useQuery<AiChatSessionWithMessages>({
    queryKey: ["/api/chat/sessions", session.id],
    enabled: isExpanded,
  });

  return (
    <div
      className={`rounded-lg border bg-card transition-colors ${isExpanded ? 'ring-1 ring-primary/20' : 'hover-elevate cursor-pointer'}`}
      data-testid={`chat-session-${session.id}`}
    >
      <div 
        className="p-3 cursor-pointer"
        onClick={onToggle}
        data-testid={`chat-session-toggle-${session.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`chat-session-title-${session.id}`}>
              {session.title || "Untitled conversation"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(session.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {isExpanded ? 'Close' : 'View'}
          </Badge>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t px-3 py-3 bg-muted/30" data-testid={`chat-session-messages-${session.id}`}>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading messages...
            </div>
          ) : sessionWithMessages?.messages && sessionWithMessages.messages.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {sessionWithMessages.messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`chat-message-${session.id}-${idx}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No messages in this conversation</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription-status"],
    enabled: isAuthenticated,
  });

  // Check if user is premium for chat history display
  const isPremium = subscriptionData?.isSubscribed ?? false;

  // Fetch chat sessions for premium users
  const { data: chatSessions, isLoading: chatSessionsLoading } = useQuery<AiChatSession[]>({
    queryKey: ["/api/chat/sessions"],
    enabled: isAuthenticated && isPremium,
  });

  // State for expanded chat session
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/customer-portal");
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (profile?.homeAddress) {
      setAddress(profile.homeAddress);
    }
  }, [profile]);

  const geocodeMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Address not found. Please check and try again.");
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { homeAddress: string | null; latitude: number | null; longitude: number | null }) => {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save profile");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      
      if (variables.homeAddress === null) {
        setAddress("");
        toast({
          title: "Address cleared",
          description: "Your home address has been removed.",
        });
      } else {
        toast({
          title: "Address saved",
          description: "Your home address has been updated. Commute times will now be calculated from this location.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save address. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!address.trim()) {
      toast({
        title: "Address required",
        description: "Please enter your home address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const coords = await geocodeMutation.mutateAsync(address);
      await saveProfileMutation.mutateAsync({
        homeAddress: address,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (error: any) {
      toast({
        title: "Geocoding failed",
        description: error.message || "Unable to find address. Please check and try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearAddress = () => {
    saveProfileMutation.mutate({
      homeAddress: null,
      latitude: null,
      longitude: null,
    });
  };

  const currentAddress = profile?.homeAddress;
  const isProcessing = geocodeMutation.isPending || saveProfileMutation.isPending;

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead 
          title="Settings"
          description="Configure your NYC School Ratings experience. Set your home address for commute time calculations."
          keywords="settings, commute calculator, home address, NYC schools"
          canonicalPath="/settings"
          noindex
        />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Require authentication - show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead 
          title="Settings"
          description="Configure your NYC School Ratings experience. Set your home address for commute time calculations."
          keywords="settings, commute calculator, home address, NYC schools"
          canonicalPath="/settings"
          noindex
        />
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Sign In Required
              </CardTitle>
              <CardDescription>
                Create an account or sign in to save your home address and see personalized commute times to schools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                With an account, you can:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Save your home address for commute calculations</li>
                <li>See transit times to every school</li>
                <li>Save favorite schools</li>
                <li>Get personalized AI recommendations</li>
              </ul>
              <div className="flex gap-2 pt-4">
                <Link href="/login?redirect=/settings">
                  <Button data-testid="button-login-settings">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In / Create Account
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead 
        title="Settings"
        description="Configure your NYC School Ratings experience. Set your home address for commute time calculations."
        keywords="settings, commute calculator, home address, NYC schools"
        canonicalPath="/settings"
        noindex
      />
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Home Address
            </CardTitle>
            <CardDescription>
              Set your home address to calculate commute times to schools using public transit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full address (e.g., 123 Main St, New York, NY 10001)"
                data-testid="input-address"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={isProcessing || !address.trim()}
                data-testid="button-save-address"
              >
                <Save className="mr-2 h-4 w-4" />
                {isProcessing ? "Saving..." : "Save Address"}
              </Button>
              {currentAddress && (
                <Button
                  variant="outline"
                  onClick={handleClearAddress}
                  disabled={isProcessing}
                  data-testid="button-clear-address"
                >
                  Clear Address
                </Button>
              )}
            </div>

            {currentAddress && (
              <div className="mt-4 p-4 bg-muted rounded-md" data-testid="text-current-address">
                <p className="text-sm font-medium mb-1">Current Address:</p>
                <p className="text-sm text-muted-foreground">
                  {currentAddress}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Manage your subscription and billing settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subscription status...
              </div>
            ) : subscriptionData?.isSubscribed && subscriptionData.subscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                  {subscriptionData.subscription.cancel_at_period_end && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Canceling
                    </Badge>
                  )}
                </div>
                
                <div className="p-4 bg-muted rounded-md space-y-2" data-testid="subscription-details">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium" data-testid="text-plan-name">
                      {subscriptionData.subscription.plan 
                        ? `${subscriptionData.subscription.plan.nickname} (${formatPrice(subscriptionData.subscription.plan.amount, subscriptionData.subscription.plan.currency)}/${subscriptionData.subscription.plan.interval})`
                        : 'Premium'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize" data-testid="text-subscription-status">
                      {subscriptionData.subscription.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {subscriptionData.subscription.cancel_at_period_end ? "Access until" : "Next billing date"}
                    </span>
                    <span className="font-medium" data-testid="text-billing-date">
                      {new Date(subscriptionData.subscription.current_period_end * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {subscriptionData.subscription.cancel_at_period_end 
                    ? "Your subscription will end at the end of the current billing period. You can reactivate anytime before then."
                    : "You have access to all premium features including unlimited AI questions, commute calculator, and smart recommendations."}
                </p>

                <Button 
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <div className="space-y-4" data-testid="free-plan-section">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="badge-free-plan">Free Plan</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  You're currently on the free plan. Upgrade to Premium to unlock unlimited AI questions, 
                  commute calculator, smart recommendations, and more.
                </p>

                <div className="p-4 bg-muted rounded-md" data-testid="premium-features-list">
                  <p className="text-sm font-medium mb-2">Premium features include:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Unlimited AI questions
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Commute time calculator
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Smart school recommendations
                    </li>
                    <li className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Historical trend analysis
                    </li>
                  </ul>
                </div>

                <Link href="/pricing">
                  <Button data-testid="button-upgrade-premium">
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Premium
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Access Section (Developer API - Premium) */}
        <ApiAccessCard isPremium={isPremium} />

        {/* AI Chat History Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              AI Chat History
            </CardTitle>
            <CardDescription>
              View your past conversations with the AI School Assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isPremium ? (
              <div className="space-y-4" data-testid="chat-history-locked">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Premium feature</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Premium to access unlimited AI questions and view your conversation history.
                </p>
                <Link href="/pricing">
                  <Button variant="outline" size="sm" data-testid="button-upgrade-for-chat">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade to Unlock
                  </Button>
                </Link>
              </div>
            ) : chatSessionsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading chat history...
              </div>
            ) : !chatSessions || chatSessions.length === 0 ? (
              <div className="text-center py-8" data-testid="no-chat-history">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No conversations yet</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Start a conversation with the AI assistant on any school page
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]" data-testid="chat-history-list">
                <div className="space-y-2">
                  {chatSessions.map((session) => (
                    <ChatSessionItem
                      key={session.id}
                      session={session}
                      isExpanded={expandedSessionId === session.id}
                      onToggle={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

