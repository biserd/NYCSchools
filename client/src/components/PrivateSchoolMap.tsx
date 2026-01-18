import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Zap } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useQuery } from "@tanstack/react-query";

interface PrivateSchoolMapProps {
  schoolName: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
}

interface UserProfile {
  homeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function PrivateSchoolMap({ schoolName, latitude, longitude, address }: PrivateSchoolMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { startCheckout, isLoading: checkoutLoading } = useCheckout();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const hasAddress = profile?.latitude && profile?.longitude;

  useEffect(() => {
    if (!mapRef.current) return;
    if (!latitude || !longitude) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([latitude, longitude], 15);

    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: "school-marker",
      html: `
        <div style="
          background: #7c3aed;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });

    L.marker([latitude, longitude], { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<strong>${schoolName}</strong>`);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, schoolName]);

  if (!latitude || !longitude) {
    return null;
  }

  const renderCommuteSection = () => {
    if (authLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Loading...</span>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div 
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20" 
          data-testid="commute-upgrade-prompt"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                See commute times from your home
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade to calculate transit times to this school
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80" 
            onClick={startCheckout}
            disabled={checkoutLoading}
            data-testid="button-upgrade-commute"
          >
            <Zap className="h-3 w-3 mr-1" />
            Get Premium
          </Button>
        </div>
      );
    }

    if (!hasAddress) {
      return (
        <div className="flex items-center gap-2" data-testid="commute-set-address">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Set your home address to see commute times
          </span>
          <Link href="/settings">
            <Button variant="outline" size="sm" data-testid="button-go-to-settings">
              Go to Settings
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <>
        <div 
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700" 
          data-testid="commute-premium-prompt"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Commute Calculator
              </p>
              <p className="text-xs text-muted-foreground">
                Upgrade to Premium to see transit times from your home
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="w-full sm:w-auto" 
            onClick={() => setShowUpgradeModal(true)}
            data-testid="button-upgrade-commute"
          >
            <Zap className="h-3 w-3 mr-1" />
            Unlock
          </Button>
        </div>
        <UpgradeModal 
          open={showUpgradeModal} 
          onOpenChange={setShowUpgradeModal}
          trigger="commute_locked"
        />
      </>
    );
  };

  return (
    <Card data-testid="card-school-map">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="h-64 rounded-lg border"
          data-testid="map-school-location"
        />
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] border border-white shadow-sm" />
          <span>School Location</span>
        </div>
        
        {(address || true) && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {address && address !== "TBD" && (
              <div className="flex items-start gap-2" data-testid="location-address">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span className="text-sm">{address}</span>
              </div>
            )}
            {renderCommuteSection()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
