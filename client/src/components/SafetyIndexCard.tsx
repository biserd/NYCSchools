import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Lock,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  SAFETY_RADIUS_OPTIONS,
  DEFAULT_SAFETY_RADIUS_METERS,
  type SafetyIndexResponse,
} from "@shared/schema";

type SchoolType = "public" | "private" | "nyceec";

interface SafetyIndexCardProps {
  schoolType: SchoolType;
  schoolKey: string;
  schoolName?: string;
}

type SafetyApiResponse = (Partial<SafetyIndexResponse> & {
  isPremium: boolean;
  // Always present (preview + premium)
  safetyIndex: number;
  label: string;
  tone: SafetyIndexResponse["tone"];
  totalReports: number;
  radiusMeters: number;
  radiusMiles: number;
  periodStart: string;
  periodEnd: string;
  lastCalculatedAt: string;
  availableRadii: number[];
});

const TONE_COLORS: Record<SafetyIndexResponse["tone"], string> = {
  excellent:
    "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  above_average:
    "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  average:
    "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  below_average:
    "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  elevated:
    "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

function formatPeriod(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function TrendBadge({
  trend,
  delta,
}: {
  trend: SafetyIndexResponse["trend"];
  delta: number | null;
}) {
  if (!trend || trend === "insufficient_data") {
    return (
      <Badge variant="outline" data-testid="badge-safety-trend">
        <Minus className="w-3 h-3 mr-1" />
        Insufficient data
      </Badge>
    );
  }
  if (trend === "improving") {
    return (
      <Badge
        variant="outline"
        className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
        data-testid="badge-safety-trend"
      >
        <TrendingDown className="w-3 h-3 mr-1" />
        Improving {delta != null ? `(${delta.toFixed(0)}%)` : ""}
      </Badge>
    );
  }
  if (trend === "worsening") {
    return (
      <Badge
        variant="outline"
        className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
        data-testid="badge-safety-trend"
      >
        <TrendingUp className="w-3 h-3 mr-1" />
        Worsening {delta != null ? `(+${delta.toFixed(0)}%)` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" data-testid="badge-safety-trend">
      <Minus className="w-3 h-3 mr-1" />
      Stable
    </Badge>
  );
}

export function SafetyIndexCard({
  schoolType,
  schoolKey,
  schoolName,
}: SafetyIndexCardProps) {
  const [radiusMeters, setRadiusMeters] = useState<number>(
    DEFAULT_SAFETY_RADIUS_METERS,
  );

  const { data, isLoading, isError, error } = useQuery<SafetyApiResponse>({
    queryKey: [`/api/safety/${schoolType}/${schoolKey}`, radiusMeters],
    queryFn: async () => {
      const res = await fetch(
        `/api/safety/${schoolType}/${schoolKey}?radius=${radiusMeters}`,
        { credentials: "include" },
      );
      if (res.status === 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Not found");
      }
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-safety-index">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Neighborhood Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="card-safety-index">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Neighborhood Safety
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-start gap-2 text-sm text-muted-foreground"
            data-testid="text-safety-unavailable"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Safety index not yet available for this school.{" "}
              {error instanceof Error && error.message
                ? `(${error.message})`
                : "Check back soon."}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tone = data.tone;
  const isPremium = data.isPremium;
  const matchedRadius = SAFETY_RADIUS_OPTIONS.find(
    (r) => r.meters === data.radiusMeters,
  );
  const radiusLabel = matchedRadius?.label ?? `${data.radiusMiles} mi`;

  return (
    <Card data-testid="card-safety-index">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Neighborhood Safety
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover-elevate rounded-md p-0.5 inline-flex"
                  aria-label="About the Neighborhood Safety score"
                  data-testid="button-safety-info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 text-sm space-y-2"
                align="start"
                data-testid="popover-safety-info"
              >
                <p className="font-semibold text-foreground">
                  How this score is calculated
                </p>
                <p className="text-muted-foreground">
                  A 0–100 score based on NYPD complaint data within the
                  selected radius over the last 12 months. Higher = safer
                  relative to other NYC schools.
                </p>
                <ul className="text-muted-foreground list-disc pl-4 space-y-1">
                  <li>
                    Reports are weighted by severity (violent felony 8 ·
                    felony 4 · misdemeanor 2 · violation 1).
                  </li>
                  <li>
                    Each school is ranked as a citywide percentile, so
                    50 ≈ average.
                  </li>
                  <li>
                    Trend compares the last 12 months to the prior 12.
                  </li>
                </ul>
                <Link
                  href="/safety-methodology"
                  className="text-primary hover:underline inline-block pt-1"
                  data-testid="link-safety-methodology-popover"
                >
                  View full methodology →
                </Link>
              </PopoverContent>
            </Popover>
          </CardTitle>
          {isPremium ? (
            <Select
              value={String(data.radiusMeters)}
              onValueChange={(v) => setRadiusMeters(parseInt(v, 10))}
            >
              <SelectTrigger
                className="h-8 w-[140px]"
                data-testid="select-safety-radius"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAFETY_RADIUS_OPTIONS.map((r) => (
                  <SelectItem
                    key={r.meters}
                    value={String(r.meters)}
                    data-testid={`option-radius-${r.meters}`}
                  >
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge
              variant="outline"
              className="text-xs"
              data-testid="badge-safety-radius"
            >
              {radiusLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div
          className={`rounded-md border p-4 ${TONE_COLORS[tone]}`}
          data-testid="block-safety-score"
        >
          <div className="flex items-baseline gap-3">
            <div
              className="text-4xl font-bold"
              data-testid="text-safety-index"
            >
              {data.safetyIndex}
            </div>
            <div className="text-sm font-medium opacity-80">/ 100</div>
            <div className="ml-auto text-right">
              <div
                className="text-base font-semibold"
                data-testid="text-safety-label"
              >
                {data.label}
              </div>
              {isPremium && data.percentileCitywide != null && (
                <div className="text-xs opacity-80" data-testid="text-safety-percentile">
                  {data.percentileCitywide}th percentile citywide
                </div>
              )}
            </div>
          </div>
          <p className="text-xs mt-3 opacity-80">
            {data.totalReports} NYPD report
            {data.totalReports === 1 ? "" : "s"} within {radiusLabel} ·{" "}
            {formatPeriod(data.periodStart, data.periodEnd)}
          </p>
        </div>

        {/* Premium-only details */}
        {isPremium ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-md border bg-muted/50 p-2"
                data-testid="stat-felony"
              >
                <div className="text-xs text-muted-foreground">
                  Felony reports
                </div>
                <div className="text-lg font-semibold">
                  {data.felonyReports ?? 0}
                  {(data.violentFelonyReports ?? 0) > 0 && (
                    <span className="ml-1 text-xs text-red-600 dark:text-red-400 font-normal">
                      ({data.violentFelonyReports} violent)
                    </span>
                  )}
                </div>
              </div>
              <div
                className="rounded-md border bg-muted/50 p-2"
                data-testid="stat-misdemeanor"
              >
                <div className="text-xs text-muted-foreground">
                  Misdemeanor reports
                </div>
                <div className="text-lg font-semibold">
                  {data.misdemeanorReports ?? 0}
                </div>
              </div>
            </div>

            {data.topCategories && data.topCategories.length > 0 && (
              <div data-testid="block-top-categories">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Most common reports
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.topCategories.slice(0, 3).map((c) => (
                    <Badge
                      key={c.category}
                      variant="secondary"
                      className="text-xs"
                      data-testid={`badge-category-${c.category}`}
                    >
                      {c.category.replace(/&/g, "&").toLowerCase()}{" "}
                      <span className="ml-1 opacity-70">({c.count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>vs prior 12 months:</span>
              <TrendBadge
                trend={data.trend ?? null}
                delta={data.trendDelta ?? null}
              />
            </div>
          </div>
        ) : (
          <div
            className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2"
            data-testid="block-safety-upgrade"
          >
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Unlock the full breakdown:</span>{" "}
                category mix, citywide percentile, year-over-year trend, and
                radius selector (¼ mile to 5 miles).
              </div>
            </div>
            <Link href="/pricing">
              <Button
                size="sm"
                className="w-full"
                data-testid="button-safety-upgrade"
              >
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                See Premium Plans
              </Button>
            </Link>
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span>
            Source: NYPD complaint data{" "}
            {schoolName ? `near ${schoolName}` : ""}
          </span>
          <Link
            href="/safety-methodology"
            className="text-primary hover:underline"
            data-testid="link-safety-methodology"
          >
            Methodology
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default SafetyIndexCard;
