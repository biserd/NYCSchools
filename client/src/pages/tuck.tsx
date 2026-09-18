import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, MessageCircle, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { TuckOverview } from "@shared/tuck";

export default function TuckPage() {
  const { user, isLoading } = useAuth();
  // Scope React Query to the signed-in account as well as server-side ownership.
  const overview = useQuery<TuckOverview>({ queryKey: ["tuck-overview", user?.id], enabled: !!user,
    queryFn: async () => (await apiRequest("GET", "/api/tuck/overview")).json(), gcTime: 0 });
  const [nickname, setNickname] = useState("");
  const [schoolDbn, setSchoolDbn] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [childId, setChildId] = useState("");
  const [detail, setDetail] = useState("");
  const change = useMutation({
    mutationFn: async ({ method = "POST", path, body }: { method?: string; path: string; body?: unknown }) => {
      await apiRequest(method, `/api/tuck/${path}`, body);
      await overview.refetch();
    },
  });
  const data = overview.data;
  const busy = change.isPending;
  return <div className="min-h-screen flex flex-col bg-background">
    <SEOHead title="My Family" description="Your private family calendar within NYC School Ratings." canonicalPath="/family" noindex />
    <AppHeader stackOnMobile />
    <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <section className="rounded-2xl border bg-teal-50 dark:bg-teal-950/30 p-6 md:p-8">
        <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">NYC SCHOOL RATINGS · FAMILY SPACE</p>
        <h1 className="text-3xl font-bold mt-2">My Family</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Keep your children’s school links and important dates together. One account, alongside your school research.</p>
        <p className="mt-4 flex items-start gap-2 text-sm"><ShieldCheck className="w-5 h-5 shrink-0" />Private to your account. Family sharing is not enabled yet.</p>
      </section>
      <Card><CardContent className="pt-6 flex gap-3"><MessageCircle className="w-6 h-6 shrink-0" /><div><h2 className="font-semibold">Parent Assistant · Coming with Family Premium</h2><p className="text-sm text-muted-foreground mt-1">This calendar does not send notifications yet. WhatsApp linking, automatic reminders and assistant features are being rebuilt here. Your current subscription and billing have not changed.</p></div></CardContent></Card>
      {isLoading ? <p role="status">Checking your account…</p> : !user ? <Card><CardContent className="pt-6 space-y-4"><h2 className="font-semibold">Use your NYC School Ratings account</h2><p>Use the same account as your school research. This manual calendar is a preview.</p><Button asChild><Link href="/login?redirect=/family">Sign in to My Family</Link></Button></CardContent></Card> : <>
        <nav className="flex flex-wrap gap-4 text-sm underline"><Link href="/favorites">Saved schools</Link><Link href="/application-tracker">Application tracker</Link><Link href="/settings">Account &amp; subscription</Link></nav>
        {overview.isLoading ? <p role="status">Loading your family space…</p> : overview.isError ? <p role="alert">Could not load your family space. <button className="underline min-h-11" onClick={() => void overview.refetch()}>Try again</button></p> : !data?.household ? <Card><CardHeader><CardTitle>Start your family calendar</CardTitle></CardHeader><CardContent className="space-y-4"><p>Use nicknames; no birth dates or sensitive details are required. School calendars are not automatically imported.</p><Button disabled={busy} onClick={() => change.mutate({ path: "household" })}>Create my family space</Button></CardContent></Card> : <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
          <Card><CardHeader><CardTitle>Your children</CardTitle></CardHeader><CardContent className="space-y-5">
            {data.children.length === 0 && <p className="text-sm text-muted-foreground">Add a nickname to organize dates by child.</p>}
            {data.children.map(child => <div key={child.id} className="border-b pb-3"><p className="font-medium">{child.nickname}</p>{child.schoolUrl && <Link className="text-sm text-primary underline" href={child.schoolUrl}>{child.schoolName}</Link>}<div><button className="text-sm underline min-h-11" disabled={busy} onClick={() => { if (window.confirm(`Remove ${child.nickname} and their calendar events?`)) change.mutate({ method: "DELETE", path: `children/${child.id}` }); }}>Remove child</button></div></div>)}
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); change.mutate({ path: "children", body: { nickname, schoolDbn: schoolDbn.trim() || null } }, { onSuccess: () => { setNickname(""); setSchoolDbn(""); } }); }}>
              <div><Label htmlFor="tuck-nickname">Child’s nickname</Label><Input id="tuck-nickname" required maxLength={50} value={nickname} onChange={e => setNickname(e.target.value)} /></div>
              <div><Label htmlFor="tuck-school">School DBN (optional)</Label><Input id="tuck-school" maxLength={6} placeholder="e.g. 02M234" value={schoolDbn} onChange={e => setSchoolDbn(e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Use the identifier from the school profile. You can leave this blank.</p></div>
              <Button type="submit" disabled={busy}>Add child</Button>
            </form>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="flex gap-2"><CalendarDays className="w-5 h-5" />Family calendar</CardTitle></CardHeader><CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">All-day dates you enter, not verified school announcements. No reminders will be sent.</p>
            {data.events.length === 0 && <p>No dates yet. Add a school visit, deadline or family event.</p>}
            <ol className="space-y-3">{data.events.map(event => <li key={event.id} className="border-l-4 border-teal-600 pl-4"><time className="text-sm font-medium" dateTime={event.date}>{new Date(`${event.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</time><p className="font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{data.children.find(child => child.id === event.childId)?.nickname || "Whole family"}</p>{event.detail && <p className="text-sm whitespace-pre-wrap">{event.detail}</p>}<button className="min-h-11 underline text-sm" disabled={busy} onClick={() => { if (window.confirm("Remove this event?")) change.mutate({ method: "DELETE", path: `events/${event.id}` }); }}>Remove event</button></li>)}</ol>
            <form className="space-y-3 border-t pt-4" onSubmit={e => { e.preventDefault(); change.mutate({ path: "events", body: { title, date, childId: childId || null, detail } }, { onSuccess: () => { setTitle(""); setDetail(""); } }); }}>
              <h3 className="font-semibold">Add an important date</h3>
              <div><Label htmlFor="tuck-title">Event title</Label><Input id="tuck-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required /></div>
              <div><Label htmlFor="tuck-date">Date</Label><Input id="tuck-date" type="date" min="2000-01-01" max="2099-12-31" value={date} onChange={e => setDate(e.target.value)} required /></div>
              <div><Label htmlFor="tuck-child">For</Label><select id="tuck-child" className="block w-full min-h-11 rounded-md border bg-background px-3" value={childId} onChange={e => setChildId(e.target.value)}><option value="">Whole family</option>{data.children.map(child => <option key={child.id} value={child.id}>{child.nickname}</option>)}</select></div>
              <div><Label htmlFor="tuck-detail">Notes (optional)</Label><Input id="tuck-detail" value={detail} onChange={e => setDetail(e.target.value)} maxLength={1000} /></div>
              <Button type="submit" disabled={busy}>Save date</Button>
            </form>
          </CardContent></Card>
        </div>}
        {change.isError && <p role="alert" className="text-destructive">{change.error.message}</p>}
      </>}
    </main><Footer />
  </div>;
}
