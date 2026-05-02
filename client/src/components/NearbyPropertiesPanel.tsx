import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ExternalLink, TrendingUp, Lock, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionStatus {
  isSubscribed: boolean;
}

interface RealtorProperty {
  id: string;
  address: string;
  city: string | null;
  zipCode: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  estimatedValue: number | null;
  pricePerSqft: number | null;
  opportunityScore: number | null;
  imageUrl: string | null;
}

interface NearbyResponse {
  zip: string;
  properties: RealtorProperty[];
  deepLink: string;
}

interface Props {
  schoolAddress: string | null | undefined;
  schoolName: string;
  zipCode?: string | null;
}

function extractZip(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

function normalizeZip(z: string | null | undefined): string | null {
  if (!z) return null;
  const m = String(z).trim().match(/^(\d{5})/);
  return m ? m[1] : null;
}

function formatMoney(value: number | null): string {
  if (value == null || !isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toLocaleString()}`;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const FREE_PREVIEW_COUNT = 2;

export function NearbyPropertiesPanel({ schoolAddress, schoolName, zipCode }: Props) {
  const zip = normalizeZip(zipCode) ?? extractZip(schoolAddress);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: subData } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription-status"],
    enabled: !authLoading && isAuthenticated,
    staleTime: 60 * 1000,
    retry: false,
  });
  const isPremium = subData?.isSubscribed ?? false;

  const { data, isLoading, isError } = useQuery<NearbyResponse>({
    queryKey: ["/api/realtors/nearby", zip],
    enabled: !!zip,
    staleTime: 60 * 60 * 1000,
  });

  if (!zip) return null;
  if (isError) return null;
  if (!isLoading && (!data || data.properties.length === 0)) return null;

  const allProps = data?.properties ?? [];
  const visibleProps = isPremium ? allProps : allProps.slice(0, FREE_PREVIEW_COUNT);
  const teaserProps = isPremium ? [] : allProps.slice(FREE_PREVIEW_COUNT);
  const hiddenCount = teaserProps.length;

  const deepLink =
    data?.deepLink ??
    `https://realtorsdashboard.com/?state=NY&zipCodes=${zip}&utm_source=nycschoolsratings&utm_medium=school_page&utm_campaign=nearby_properties`;

  return (
    <Card data-testid="card-nearby-properties">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nearby Properties & Market Data
          </span>
          <Badge variant="outline" className="font-normal">
            ZIP {zip}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Shopping for a home near {schoolName}? Live property data from our sister
          site Realtors Dashboard.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" data-testid={`skeleton-property-${i}`} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleProps.map((p, idx) => {
                const addr = titleCase(p.address);
                const isHighOpp = (p.opportunityScore ?? 0) >= 75;
                return (
                  <a
                    key={p.id}
                    href={`https://realtorsdashboard.com/property/${p.id}?utm_source=nycschoolsratings&utm_medium=school_page&utm_campaign=nearby_properties`}
                    target="_blank"
                    rel="noopener"
                    className="block rounded-md border p-3 hover-elevate"
                    data-testid={`link-property-${idx}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate" data-testid={`text-property-address-${idx}`}>
                          {addr}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.propertyType ?? "Property"}
                          {p.sqft ? ` · ${p.sqft.toLocaleString()} sqft` : ""}
                          {p.yearBuilt ? ` · Built ${p.yearBuilt}` : ""}
                        </div>
                      </div>
                      {isHighOpp && (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {p.opportunityScore}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2 flex-wrap">
                      <div>
                        <div
                          className="font-semibold tabular-nums"
                          data-testid={`text-property-value-${idx}`}
                        >
                          {formatMoney(p.estimatedValue)}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. value</div>
                      </div>
                      {p.pricePerSqft != null && (
                        <div className="text-right">
                          <div className="text-sm font-medium tabular-nums">
                            ${p.pricePerSqft}/sqft
                          </div>
                        </div>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>

            {hiddenCount > 0 && (
              <div className="relative" data-testid="block-properties-upgrade">
                <div
                  className="grid gap-3 sm:grid-cols-2 pointer-events-none select-none"
                  aria-hidden="true"
                  style={{ filter: "blur(6px)", opacity: 0.55 }}
                >
                  {teaserProps.map((p) => (
                    <div key={p.id} className="rounded-md border p-3">
                      <div className="font-medium truncate">{titleCase(p.address)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.propertyType ?? "Property"}
                        {p.sqft ? ` · ${p.sqft.toLocaleString()} sqft` : ""}
                      </div>
                      <div className="mt-2 font-semibold tabular-nums">
                        {formatMoney(p.estimatedValue)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center p-2">
                  <div className="rounded-md border border-dashed border-primary/30 bg-background/95 backdrop-blur-sm p-3 max-w-sm w-full text-center space-y-2 shadow-sm">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      <Lock className="w-4 h-4 text-primary" />
                      {hiddenCount} more {hiddenCount === 1 ? "property" : "properties"} nearby
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isAuthenticated
                        ? "Unlock all nearby listings, opportunity scores, and market trends with Premium."
                        : "Sign in or upgrade to Premium to see all nearby listings and market data."}
                    </p>
                    <Link href="/pricing">
                      <Button size="sm" className="w-full" data-testid="button-properties-upgrade">
                        <Crown className="w-3.5 h-3.5 mr-1.5" />
                        See Premium Plans
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Property intelligence from Realtors Dashboard. Updated daily.
          </p>
          <Button asChild variant="outline" size="sm" data-testid="button-view-all-properties">
            <a href={deepLink} target="_blank" rel="noopener">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              View all in {zip}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
