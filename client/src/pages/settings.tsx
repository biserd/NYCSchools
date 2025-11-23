import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MapPin, Save } from "lucide-react";
import { UserProfile } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
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
    mutationFn: async (data: { homeAddress: string; latitude: number; longitude: number }) => {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Address saved",
        description: "Your home address has been updated.",
      });
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

  const isProcessing = geocodeMutation.isPending || saveProfileMutation.isPending;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your home address to calculate commute times to schools
        </p>
      </div>

      <Card data-testid="card-address-settings">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Home Address</CardTitle>
          </div>
          <CardDescription>
            Enter your home address to see estimated commute times to each school using public transit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-address">Address</Label>
            <Input
              id="input-address"
              data-testid="input-address"
              placeholder="123 Main St, New York, NY 10001"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isProcessing || isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Include street address, city, state, and ZIP code for best results
            </p>
          </div>

          <Button
            data-testid="button-save-address"
            onClick={handleSave}
            disabled={isProcessing || isLoading}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {isProcessing ? "Saving..." : "Save Address"}
          </Button>

          {profile?.homeAddress && (
            <div className="mt-4 p-4 bg-muted rounded-md" data-testid="text-current-address">
              <p className="text-sm font-medium mb-1">Current Address:</p>
              <p className="text-sm text-muted-foreground">{profile.homeAddress}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
