import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Activity, AlertTriangle, ShieldOff, ChevronRight, RefreshCcw } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

interface KeyUsageSummary {
  total: number;
  errors429: number;
  distinctIps: number;
}

interface KeyRow {
  id: number;
  userId: string;
  ownerEmail: string | null;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  usage24h: KeyUsageSummary;
  usage7d: KeyUsageSummary;
}

interface OverviewResponse {
  now: string;
  keys: KeyRow[];
  top24h: Array<{ keyId: number; total: number }>;
  recent429s: Array<{ keyId: number | null; path: string; ts: string; ip: string | null }>;
}

interface KeyDetailResponse {
  keyId: number;
  recentRequests: Array<{ path: string; status: number; ts: string; ip: string | null; responseTimeMs: number | null }>;
  ips: Array<{ ip: string; count: number; lastSeen: string }>;
  byPath: Array<{ path: string; count: number }>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}

function statusBadge(status: number) {
  if (status >= 500) return <Badge variant="destructive" data-testid={`badge-status-${status}`}>{status}</Badge>;
  if (status === 429) return <Badge variant="destructive" data-testid={`badge-status-${status}`}>{status}</Badge>;
  if (status >= 400) return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
  return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
}

export default function AdminApiUsagePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null);

  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: ["/api/admin/api-usage/overview"],
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const detailQuery = useQuery<KeyDetailResponse>({
    queryKey: ["/api/admin/api-usage/key", selectedKeyId],
    enabled: selectedKeyId !== null,
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/api-usage/key/${id}/revoke`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "API key revoked", description: "The key can no longer authenticate any requests." });
      setConfirmRevokeId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-usage/overview"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to revoke key", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  // Auth gate. Server enforces ADMIN_EMAILS too — this is just for UX so
  // a non-admin doesn't see a flash of dashboard chrome before the 403.
  // Use useEffect so the redirect doesn't run during render (which would
  // cause a setState-in-render warning).
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="API Usage Admin" description="Private administration page." canonicalPath="/admin/api-usage" noindex />
        <AppHeader />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const overview = overviewQuery.data;
  const isForbidden = (overviewQuery.error as any)?.message?.includes("403") ||
    (overviewQuery.error as any)?.status === 403;

  if (isForbidden) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="API Usage Admin" description="Private administration page." canonicalPath="/admin/api-usage" noindex />
        <AppHeader />
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-16 text-center">
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-forbidden-title">Admin access required</h1>
          <p className="text-muted-foreground" data-testid="text-forbidden-message">
            Your account ({user?.email}) is not configured as an admin.
          </p>
        </div>
      </div>
    );
  }

  const totalKeys = overview?.keys.length ?? 0;
  const activeKeys = overview?.keys.filter((k) => !k.revokedAt).length ?? 0;
  const total24h = overview?.keys.reduce((sum, k) => sum + k.usage24h.total, 0) ?? 0;
  const total429s24h = overview?.keys.reduce((sum, k) => sum + k.usage24h.errors429, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="API Usage Admin" description="Private administration page." canonicalPath="/admin/api-usage" noindex />
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1" data-testid="text-page-title">
              API Usage Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor every Developer API key, spot abuse, and revoke keys instantly.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => overviewQuery.refetch()}
            disabled={overviewQuery.isFetching}
            data-testid="button-refresh"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active keys</CardDescription>
              <CardTitle className="text-3xl" data-testid="stat-active-keys">{activeKeys}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {totalKeys - activeKeys} revoked
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Requests (24h)</CardDescription>
              <CardTitle className="text-3xl" data-testid="stat-requests-24h">{total24h.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              across all keys
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rate-limit hits (24h)</CardDescription>
              <CardTitle className="text-3xl" data-testid="stat-429s-24h">{total429s24h.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              429 responses
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last refresh</CardDescription>
              <CardTitle className="text-base font-medium" data-testid="stat-last-refresh">
                {overview ? relativeTime(overview.now) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              auto every 60s
            </CardContent>
          </Card>
        </div>

        {/* Keys table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              All API keys
            </CardTitle>
            <CardDescription>
              Click a row to drill in. The "IPs (24h)" column flags keys seen from 10+ distinct IPs (possible leak).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : !overview || overview.keys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center" data-testid="text-no-keys">
                No API keys have been issued yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead className="text-right">24h</TableHead>
                      <TableHead className="text-right">429s</TableHead>
                      <TableHead className="text-right">IPs (24h)</TableHead>
                      <TableHead className="text-right">7d</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.keys.map((k) => (
                      <TableRow
                        key={k.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedKeyId(k.id)}
                        data-testid={`row-key-${k.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-owner-${k.id}`}>
                          {k.ownerEmail || <span className="text-muted-foreground">unknown</span>}
                        </TableCell>
                        <TableCell>{k.name}</TableCell>
                        <TableCell className="font-mono text-xs">{k.keyPrefix}…</TableCell>
                        <TableCell className="text-right tabular-nums" data-testid={`text-24h-${k.id}`}>
                          {k.usage24h.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {k.usage24h.errors429 > 0 ? (
                            <Badge variant="destructive">{k.usage24h.errors429}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {k.usage24h.distinctIps >= 10 ? (
                            <Badge variant="destructive" data-testid={`badge-ips-spike-${k.id}`}>
                              {k.usage24h.distinctIps}
                            </Badge>
                          ) : (
                            k.usage24h.distinctIps
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {k.usage7d.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {relativeTime(k.lastUsedAt)}
                        </TableCell>
                        <TableCell>
                          {k.revokedAt ? (
                            <Badge variant="outline" data-testid={`badge-revoked-${k.id}`}>revoked</Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-active-${k.id}`}>active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!k.revokedAt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmRevokeId(k.id);
                              }}
                              data-testid={`button-revoke-${k.id}`}
                            >
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent 429s */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent rate-limit hits
            </CardTitle>
            <CardDescription>The 20 most recent 429 responses across all keys.</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : !overview || overview.recent429s.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-429s">
                No rate-limit hits in the recent log window. Healthy.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Key id</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recent429s.map((r, i) => (
                    <TableRow key={i} data-testid={`row-429-${i}`}>
                      <TableCell className="text-sm">{formatDateTime(r.ts)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.keyId ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.path}</TableCell>
                      <TableCell className="font-mono text-xs">{r.ip || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down dialog */}
      <Dialog open={selectedKeyId !== null} onOpenChange={(open) => !open && setSelectedKeyId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-detail-title">Key detail · #{selectedKeyId}</DialogTitle>
            <DialogDescription>Last 100 requests, top IPs and paths in the last 24 hours.</DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <Skeleton className="h-64" />
          ) : !detailQuery.data ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Top paths (24h)</h3>
                {detailQuery.data.byPath.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No traffic in the last 24h.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailQuery.data.byPath.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{p.path}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.count.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Top IPs (24h)</h3>
                {detailQuery.data.ips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No IPs recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                        <TableHead>Last seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailQuery.data.ips.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.count.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{relativeTime(row.lastSeen)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Recent requests (last 100)</h3>
                {detailQuery.data.recentRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead className="text-right">ms</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailQuery.data.recentRequests.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{relativeTime(r.ts)}</TableCell>
                          <TableCell className="font-mono text-xs">{r.path}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="font-mono text-xs">{r.ip || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.responseTimeMs ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={confirmRevokeId !== null} onOpenChange={(open) => !open && setConfirmRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this API key?</DialogTitle>
            <DialogDescription>
              The key will stop authenticating immediately. The owner will need to issue a new one from
              their Settings page. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevokeId(null)} data-testid="button-cancel-revoke">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRevokeId && revokeMutation.mutate(confirmRevokeId)}
              disabled={revokeMutation.isPending}
              data-testid="button-confirm-revoke"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              {revokeMutation.isPending ? "Revoking…" : "Yes, revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
