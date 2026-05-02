import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ExternalLink, TrendingUp } from "lucide-react";

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
}

function extractZip(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
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

export function NearbyPropertiesPanel({ schoolAddress, schoolName }: Props) {
  const zip = extractZip(schoolAddress);

  const { data, isLoading, isError } = useQuery<NearbyResponse>({
    queryKey: ["/api/realtors/nearby", zip],
    enabled: !!zip,
    staleTime: 60 * 60 * 1000,
  });

  if (!zip) return null;
  if (isError) return null;
  if (!isLoading && (!data || data.properties.length === 0)) return null;

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
          <div className="grid gap-3 sm:grid-cols-2">
            {data!.properties.map((p, idx) => {
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
