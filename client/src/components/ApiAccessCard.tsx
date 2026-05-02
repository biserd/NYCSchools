import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Lock,
  ExternalLink,
} from "lucide-react";

interface ApiKeySummary {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface IssuedKeyResponse extends ApiKeySummary {
  plaintextKey: string;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
}

interface Props {
  isPremium: boolean;
}

export function ApiAccessCard({ isPremium }: Props) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [issued, setIssued] = useState<IssuedKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys, isLoading } = useQuery<ApiKeySummary[]>({
    queryKey: ["/api/api-keys"],
    enabled: isPremium,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/api-keys", { name });
      return (await res.json()) as IssuedKeyResponse;
    },
    onSuccess: (data) => {
      setIssued(data);
      setKeyName("");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't create API key",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      toast({ title: "API key revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
    onError: () => {
      toast({
        title: "Failed to revoke key",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.plaintextKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the key manually.",
        variant: "destructive",
      });
    }
  };

  // Free / non-premium users see an upgrade CTA.
  if (!isPremium) {
    return (
      <Card className="mt-6" id="api-access">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Access
          </CardTitle>
          <CardDescription>
            Programmatic access to NYC school data via our REST API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground" data-testid="api-locked">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Premium feature</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Upgrade to Premium to generate API keys and access 1,500+ NYC schools through our
            developer API. Includes 60 requests/minute and 10,000 requests/day per key.
          </p>
          <div className="flex gap-2">
            <Link href="/pricing">
              <Button data-testid="button-upgrade-for-api">
                <Key className="mr-2 h-4 w-4" />
                Upgrade for API Access
              </Button>
            </Link>
            <Link href="/developers/docs">
              <Button variant="outline" data-testid="button-view-api-docs">
                View Documentation
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeKeys = (keys ?? []).filter((k) => !k.revokedAt);
  const revokedKeys = (keys ?? []).filter((k) => k.revokedAt);

  return (
    <>
      <Card className="mt-6" id="api-access">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Access
              </CardTitle>
              <CardDescription>
                Generate API keys to use the NYC School Ratings developer API. 60 requests/minute,
                10,000 per day, per key.
              </CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-generate-api-key" disabled={activeKeys.length >= 5}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate a new API key</DialogTitle>
                  <DialogDescription>
                    Give this key a memorable name so you can recognize it later. The key value
                    itself will be shown only once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="api-key-name">
                    Key name <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="api-key-name"
                    placeholder="e.g. Production server, Local dev, Notebook"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    maxLength={80}
                    data-testid="input-api-key-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use a default label like "API key 1".
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    data-testid="button-cancel-create-key"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate(keyName.trim())}
                    disabled={createMutation.isPending}
                    data-testid="button-confirm-create-key"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Generate Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <Link href="/developers/docs">
              <Button variant="outline" size="sm" data-testid="link-api-docs">
                Documentation
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <span className="self-center">
              Active keys: {activeKeys.length} / 5
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading API keys...
            </div>
          ) : (keys ?? []).length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-md" data-testid="no-api-keys">
              <Key className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate your first key to start using the API.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-md"
                  data-testid={`api-key-row-${k.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-api-key-name-${k.id}`}>
                        {k.name}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {k.keyPrefix}…
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {formatDate(k.createdAt)} · Last used {formatDate(k.lastUsedAt)}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-revoke-api-key-${k.id}`}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Any application using <span className="font-mono">{k.keyPrefix}…</span>{" "}
                          will immediately stop working. This cannot be undone — you'll need to
                          generate a new key.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revokeMutation.mutate(k.id)}
                          data-testid={`button-confirm-revoke-${k.id}`}
                        >
                          Revoke key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {revokedKeys.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-2">
                    Show {revokedKeys.length} revoked key{revokedKeys.length === 1 ? "" : "s"}
                  </summary>
                  <div className="space-y-2 mt-2">
                    {revokedKeys.map((k) => (
                      <div
                        key={k.id}
                        className="flex items-center justify-between gap-3 p-3 border rounded-md opacity-60"
                        data-testid={`api-key-row-revoked-${k.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium line-through">{k.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Revoked
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {k.keyPrefix}… · Revoked {formatDate(k.revokedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* One-time plaintext display dialog. */}
      <Dialog open={!!issued} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy this key now — for security, we'll never show it again. If you lose it, you'll
              need to revoke it and generate a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Treat this key like a password. Anyone with it can make API requests on your behalf
                and consume your rate limit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={issued?.plaintextKey ?? ""}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
                data-testid="text-plaintext-api-key"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                data-testid="button-copy-plaintext-key"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIssued(null)} data-testid="button-dismiss-plaintext-dialog">
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
