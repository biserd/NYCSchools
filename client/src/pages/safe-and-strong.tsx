import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ZAxis,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, TrendingUp, Award, ExternalLink } from "lucide-react";

type Row = {
  dbn: string;
  name: string;
  slug: string;
  borough: string;
  district: number;
  gradeBand: string;
  enrollment: number;
  overallScore: number;
  safetyIndex: number;
  combinedScore: number;
};

const BOROUGH_NAMES: Record<string, string> = {
  M: "Manhattan",
  X: "Bronx",
  K: "Brooklyn",
  Q: "Queens",
  R: "Staten Island",
};

const BOROUGH_COLORS: Record<string, string> = {
  M: "hsl(217 91% 60%)",
  X: "hsl(346 87% 55%)",
  K: "hsl(142 76% 42%)",
  Q: "hsl(38 92% 50%)",
  R: "hsl(271 81% 60%)",
};

const GRADE_BANDS = [
  { value: "all", label: "All grades" },
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle" },
  { value: "high", label: "High" },
];

function bandMatches(schoolBand: string, filter: string): boolean {
  if (filter === "all") return true;
  const b = (schoolBand || "").toLowerCase();
  if (filter === "elementary") return b.includes("elementary") || b.includes("k-") || b === "k";
  if (filter === "middle") return b.includes("middle") || b.includes("intermediate") || b.includes("junior");
  if (filter === "high") return b.includes("high") || b.includes("secondary");
  return true;
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: Row = payload[0].payload;
  return (
    <div className="bg-background border rounded-md shadow-lg p-3 text-sm max-w-xs" data-testid="tooltip-school-point">
      <div className="font-semibold leading-tight mb-1">{d.name}</div>
      <div className="text-muted-foreground text-xs mb-2">
        {BOROUGH_NAMES[d.borough]} · District {d.district}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Safety</div>
          <div className="font-semibold">{d.safetyIndex}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Rating</div>
          <div className="font-semibold">{d.overallScore}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Combined</div>
          <div className="font-semibold text-primary">{d.combinedScore}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">Click to open</div>
    </div>
  );
}

export default function SafeAndStrongPage() {
  const [boroughFilter, setBoroughFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const { data: rows, isLoading } = useQuery<Row[]>({
    queryKey: ["/api/safe-and-strong"],
    staleTime: 1000 * 60 * 30,
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (boroughFilter !== "all" && r.borough !== boroughFilter) return false;
      if (!bandMatches(r.gradeBand, gradeFilter)) return false;
      return true;
    });
  }, [rows, boroughFilter, gradeFilter]);

  const byBorough = useMemo(() => {
    const groups: Record<string, Row[]> = { M: [], X: [], K: [], Q: [], R: [] };
    for (const r of filtered) {
      if (groups[r.borough]) groups[r.borough].push(r);
    }
    return groups;
  }, [filtered]);

  const top10 = useMemo(() => {
    return [...filtered].sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 10);
  }, [filtered]);

  const stats = useMemo(() => {
    if (!filtered.length) return { count: 0, topTier: 0, avgCombined: 0 };
    const topTier = filtered.filter((r) => r.safetyIndex >= 70 && r.overallScore >= 70).length;
    const avgCombined = Math.round(
      filtered.reduce((s, r) => s + r.combinedScore, 0) / filtered.length,
    );
    return { count: filtered.length, topTier, avgCombined };
  }, [filtered]);

  const description =
    "Interactive scatter plot of every NYC public elementary, middle, and high school by neighborhood safety and overall school rating. The top-right quadrant shows the safest, highest-rated schools.";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Safest & Highest-Rated NYC Schools"
        description={description}
        canonicalPath="/safe-and-strong"
      />
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-6 h-6 text-primary" />
            <Badge variant="secondary" data-testid="badge-page-type">New dashboard</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-page-title">
            Safest &amp; Highest-Rated NYC Schools
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Every dot below is one NYC public or charter school. The horizontal axis is the
            Neighborhood Safety Index (0&ndash;100, higher is safer). The vertical axis is the
            Overall School Rating (academics, climate, progress). The top-right corner is the
            sweet spot &mdash; <strong>safest neighborhoods, highest-rated schools.</strong>
          </p>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="card-stat-count">
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Schools shown
              </div>
              <div className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-20" /> : stats.count.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-top-tier">
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <Award className="w-3 h-3" /> Top tier (Safety 70+ &amp; Rating 70+)
              </div>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? <Skeleton className="h-8 w-20" /> : stats.topTier.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-avg">
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Average combined score
              </div>
              <div className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-20" /> : stats.avgCombined}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Borough:</span>
            <Button
              variant={boroughFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setBoroughFilter("all")}
              data-testid="button-borough-all"
            >
              All
            </Button>
            {Object.entries(BOROUGH_NAMES).map(([code, name]) => (
              <Button
                key={code}
                variant={boroughFilter === code ? "default" : "outline"}
                size="sm"
                onClick={() => setBoroughFilter(code)}
                data-testid={`button-borough-${code.toLowerCase()}`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: BOROUGH_COLORS[code] }}
                />
                {name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-4">
            <span className="text-sm text-muted-foreground">Grade:</span>
            {GRADE_BANDS.map((g) => (
              <Button
                key={g.value}
                variant={gradeFilter === g.value ? "default" : "outline"}
                size="sm"
                onClick={() => setGradeFilter(g.value)}
                data-testid={`button-grade-${g.value}`}
              >
                {g.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Scatter chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Safety × Rating quadrant</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[500px] w-full" />
            ) : (
              <div className="w-full h-[500px]" data-testid="chart-scatter">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="safetyIndex"
                      name="Safety Index"
                      domain={[0, 100]}
                      label={{
                        value: "Neighborhood Safety Index (higher = safer)",
                        position: "bottom",
                        offset: 10,
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="overallScore"
                      name="Overall Rating"
                      domain={[0, 100]}
                      label={{
                        value: "Overall School Rating",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                      }}
                    />
                    <ZAxis type="number" dataKey="enrollment" range={[30, 200]} />
                    {/* Top-right quadrant highlight */}
                    <ReferenceArea
                      x1={70}
                      x2={100}
                      y1={70}
                      y2={100}
                      fill="hsl(142 76% 42%)"
                      fillOpacity={0.06}
                      stroke="hsl(142 76% 42%)"
                      strokeOpacity={0.3}
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine x={70} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} strokeDasharray="2 4" />
                    <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} strokeDasharray="2 4" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ScatterTooltip />} />
                    {Object.entries(BOROUGH_NAMES).map(([code, name]) => (
                      <Scatter
                        key={code}
                        name={name}
                        data={byBorough[code]}
                        fill={BOROUGH_COLORS[code]}
                        fillOpacity={0.65}
                        onClick={(p: any) => {
                          if (p?.slug) window.location.href = `/school/${p.slug}`;
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
              {Object.entries(BOROUGH_NAMES).map(([code, name]) => (
                <div key={code} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: BOROUGH_COLORS[code] }}
                  />
                  {name}
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                Dot size = enrollment · Click any dot to open the school
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Top 10: safest &amp; highest-rated
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : top10.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No schools match the current filters.
              </p>
            ) : (
              <div className="divide-y">
                {top10.map((r, i) => (
                  <Link key={r.dbn} href={`/school/${r.slug}`}>
                    <div
                      className="flex items-center gap-3 py-3 hover-elevate active-elevate-2 px-2 -mx-2 rounded-md cursor-pointer"
                      data-testid={`row-top10-${r.dbn}`}
                    >
                      <div className="text-2xl font-bold text-muted-foreground w-8 text-right">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {BOROUGH_NAMES[r.borough]} · District {r.district} · DBN {r.dbn}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs">Safety</div>
                          <div className="font-semibold">{r.safetyIndex}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs">Rating</div>
                          <div className="font-semibold">{r.overallScore}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs">Combined</div>
                          <div className="font-bold text-primary">{r.combinedScore}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Methodology footer */}
        <div className="mt-8 text-sm text-muted-foreground max-w-3xl">
          <p className="mb-2">
            <strong>How the combined score works:</strong> 50% Neighborhood Safety Index +
            50% Overall School Rating. Safety is calculated from severity-weighted NYPD
            complaint data within a half-mile of each school over a rolling 12-month window
            and ranked as a citywide percentile. Rating is academics (40%) + climate (30%) +
            progress (30%). See{" "}
            <Link href="/safety-methodology">
              <span className="text-primary underline">the safety methodology page</span>
            </Link>{" "}
            for full details.
          </p>
        </div>
      </main>
    </div>
  );
}
