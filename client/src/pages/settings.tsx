import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { MapPin, Save, Settings as SettingsIcon, LogIn } from "lucide-react";
import { UserProfile } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

export default function Settings() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
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
                <Link href="/auth">
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
      </main>
      <Footer />
    </div>
  );
}

