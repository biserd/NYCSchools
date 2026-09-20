import {useEffect,useState} from 'react';
import {useMutation,useQuery} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import type {ParentPreferences,ParentReminder,CalendarSuggestion} from '@shared/parent-assistant';
import type {TuckOverview} from '@shared/tuck';

type Overview={enabled:boolean;entitled:boolean;deliveryEnabled:boolean;preferences:ParentPreferences;reminders:ParentReminder[];limits:{questionsPerDay:number;remindersPerMonth:number}};
type Answer={message:string;draftId?:string;summary?:string;expiresAt?:number;attribution?:string;sources?:{name:string;url:string}[]};
const initial:ParentPreferences={timezone:'America/New_York',quietStart:21,quietEnd:8,reminderConsent:false,aiConsent:false};
export function ParentAssistantPanel({userId,events,onSaved}:{userId:string;events:TuckOverview['events'];onSaved:()=>void}) {
  const status=useQuery<Overview>({queryKey:['parent-assistant',userId],gcTime:0,queryFn:async()=>(await apiRequest('GET','/api/tuck/assistant')).json()});
  const calendar=useQuery<{scope:string;events:CalendarSuggestion[]}>({queryKey:['parent-calendar',userId],enabled:!!status.data?.enabled,gcTime:0,queryFn:async()=>(await apiRequest('GET','/api/tuck/assistant/calendar')).json()});
  const [prefs,setPrefs]=useState(initial),[message,setMessage]=useState(''),[answer,setAnswer]=useState<Answer|null>(null),[scope,setScope]=useState(false);
  const [eventId,setEventId]=useState(''),[localDate,setLocalDate]=useState(''),[localTime,setLocalTime]=useState('09:00');
  const [progressStep,setProgressStep]=useState(0);
  useEffect(()=>{if(status.data)setPrefs(status.data.preferences);},[status.data?.preferences]);
  const action=useMutation({mutationFn:async({path,method='POST',body}:{path:string;method?:string;body?:unknown})=>{
    const response=await apiRequest(method,`/api/tuck/assistant${path}`,body);
    return response.status===204?null:await response.json() as Answer;
  },onSuccess:async(result)=>{if(result?.message)setAnswer(result);await status.refetch();onSaved();}});
  const enabled=status.data?.enabled&&status.data.entitled,busy=action.isPending;
  const asking=busy&&action.variables?.path==='/message';
  useEffect(()=>{
    if(!asking){setProgressStep(0);return;}
    const checking=window.setTimeout(()=>setProgressStep(1),2500);
    const preparing=window.setTimeout(()=>setProgressStep(2),8000);
    return()=>{window.clearTimeout(checking);window.clearTimeout(preparing);};
  },[asking]);
  const progress=['Reading your request…','Checking the relevant school and calendar data…','Preparing your answer…'][progressStep];
  if(status.isLoading)return <p role="status">Checking Parent Assistant…</p>;
  if(status.isError)return <p role="alert">Parent Assistant could not load. Your manual calendar is still available. <button className="underline min-h-11" onClick={()=>void status.refetch()}>Retry</button></p>;
  if(!enabled)return <Card><CardHeader><CardTitle>Parent Assistant</CardTitle></CardHeader><CardContent><p>{status.data?.enabled?'An active paid plan is required. Active Research Pass customers are grandfathered through their original expiry.':'Reminders and AI assistance are not launched yet. You can still link WhatsApp and use your manual calendar.'}</p></CardContent></Card>;
  return <section className="space-y-6" aria-label="Parent Assistant">
    <Card className="border-teal-300"><CardHeader><CardTitle>Parent Assistant</CardTitle></CardHeader><CardContent className="space-y-5">
      <p>Plan a school visit, ask about your saved schools, or set a reminder. Every calendar change needs your confirmation.</p>
      {!status.data?.deliveryEnabled&&<p role="status" className="rounded-lg border border-amber-300 bg-amber-50 text-amber-950 p-3">Preview: WhatsApp reminder delivery is not enabled yet. You can prepare your calendar and test assistant requests. Do not rely on queued reminders until delivery is enabled.</p>}
      <form className="space-y-3" aria-busy={asking} onSubmit={e=>{e.preventDefault();setAnswer(null);action.mutate({path:'/message',body:{message}});}}>
        <Label htmlFor="parent-request">What can I help with?</Label>
        <textarea id="parent-request" className="w-full min-h-28 rounded-md border bg-background p-3" maxLength={1500} required value={message} onChange={e=>setMessage(e.target.value)} placeholder={'Examples: “Tell me about my saved schools” or “Add a school visit on 2026-10-12; remind me on 2026-10-11 at 09:00.”'} />
        <Button disabled={busy}>{asking?'Working…':'Ask Parent Assistant'}</Button>
        {asking&&<div role="status" aria-live="polite" className="flex min-h-11 items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 text-sm text-teal-950">
          <span aria-hidden="true" className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-teal-600"/><span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:150ms]"/><span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:300ms]"/></span>
          <span>{progress}</span>
        </div>}
        <p className="text-xs text-muted-foreground">Submitting sends this request, today's date and your timezone to Cloudflare AI for interpretation. Saved family records are not sent to the model. Up to {status.data?.limits.questionsPerDay} requests/day. School statistics come from our database. Avoid sensitive child, medical or financial details.</p>
      </form>
      {answer&&<div aria-live="polite" className="rounded-xl border bg-muted/30 p-4 space-y-3"><p className="whitespace-pre-wrap">{answer.message}</p>{answer.summary&&<p className="font-medium whitespace-pre-wrap">{answer.summary}</p>}{answer.attribution&&<p className="text-sm text-muted-foreground">{answer.attribution}</p>}{answer.sources?.map(s=><a key={s.url} className="block underline min-h-11" href={s.url}>{s.name} — view data &amp; sources</a>)}{answer.draftId&&<><p className="text-sm">Check all dates. This draft expires in 10 minutes; nothing has been added yet.</p><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>action.mutate({path:`/drafts/${answer.draftId}/confirm`})}>Confirm &amp; save</Button><Button variant="outline" disabled={busy} onClick={()=>action.mutate({path:`/drafts/${answer.draftId}`,method:'DELETE'})}>Discard</Button></div></>}</div>}
      {action.isError&&<p role="alert" className="text-destructive">{action.error.message}</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Timezone &amp; quiet hours</CardTitle></CardHeader><CardContent>
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();action.mutate({path:'/preferences',method:'PUT',body:prefs});}}>
        <div><Label htmlFor="parent-timezone">Timezone</Label><Input id="parent-timezone" required value={prefs.timezone} onChange={e=>setPrefs({...prefs,timezone:e.target.value})}/><p className="text-xs text-muted-foreground">For example America/New_York. Existing reminders retain their scheduled instant.</p></div>
        <div className="grid grid-cols-2 gap-4">{(['quietStart','quietEnd'] as const).map((field,i)=><div key={field}><Label htmlFor={field}>{i?'Quiet hours end':'Quiet hours start'}</Label><select id={field} className="w-full min-h-11 rounded border bg-background px-3" value={prefs[field]} onChange={e=>setPrefs({...prefs,[field]:Number(e.target.value)})}>{Array.from({length:24},(_,h)=><option value={h} key={h}>{String(h).padStart(2,'0')}:00</option>)}</select></div>)}</div>
        <Button disabled={busy}>Save preferences</Button>
      </form>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>WhatsApp reminders</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Delivery is checked every five minutes when enabled, with quiet-hour deferral. Messages link back to your private calendar, without exposing event details in notifications. Delivery can fail; keep your own backup for critical deadlines.</p>
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();action.mutate({path:'/reminders',body:{eventId,localDate,localTime}});}}>
        <Label htmlFor="reminder-event">Calendar event</Label><select required id="reminder-event" className="block w-full min-h-11 rounded border bg-background px-3" value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">Choose an event</option>{events.map(e=><option key={e.id} value={e.id}>{e.date} · {e.title}</option>)}</select>
        <div className="grid grid-cols-2 gap-4"><div><Label htmlFor="reminder-date">Reminder date</Label><Input id="reminder-date" type="date" required value={localDate} onChange={e=>setLocalDate(e.target.value)}/></div><div><Label htmlFor="reminder-time">Time ({status.data?.preferences.timezone})</Label><Input id="reminder-time" type="time" required value={localTime} onChange={e=>setLocalTime(e.target.value)}/></div></div>
        <Button disabled={busy}>Schedule reminder</Button>
        <p className="text-xs text-muted-foreground">Scheduling authorizes this requested WhatsApp reminder. Up to {status.data?.limits.remindersPerMonth} reminders per UTC calendar month. Send STOP or disconnect to cancel pending reminders and stop messaging. No marketing.</p>
      </form>
      <ul className="divide-y">{status.data?.reminders.map(r=><li key={r.id} className="py-3"><p className="font-medium">{r.title}</p><p className="text-sm">{new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:r.timezone}).format(r.due_at)} ({r.timezone})</p><p className="text-sm">Status: {r.status}{r.status==='uncertain'?' — provider delivery could not be confirmed; not automatically retried.':''}</p>{r.status==='pending'&&<Button variant="ghost" disabled={busy} onClick={()=>action.mutate({path:`/reminders/${r.id}`,method:'DELETE'})}>Cancel reminder</Button>}</li>)}</ul>
      {!status.data?.reminders.length&&<p className="text-sm text-muted-foreground">No reminders yet.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Official NYCPS dates · 2026–27</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>{calendar.data?.scope}</p><p className="text-sm text-muted-foreground">Selected common dates, reviewed September 19, 2026. Not a live feed or a complete school-specific calendar. Confirm updates with your school.</p>
      <label className="flex gap-3 min-h-11 items-start"><input className="h-5 w-5 mt-1 shrink-0" type="checkbox" checked={scope} onChange={e=>setScope(e.target.checked)}/><span>My school follows the NYCPS district-school calendar. I will verify these dates before adding them.</span></label>
      {calendar.isError&&<p role="alert">Calendar suggestions could not load.</p>}
      <ul className="divide-y">{calendar.data?.events.map(e=><li key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3"><div><time className="text-sm" dateTime={e.date}>{e.date}</time><p className="font-medium">{e.title}</p><a href={e.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-sm underline inline-flex min-h-11 items-center">Official source</a></div><Button variant="outline" disabled={!scope||busy} onClick={()=>action.mutate({path:`/calendar/${e.id}`,body:{confirmedScope:scope}})}>Review &amp; add</Button></li>)}</ul>
    </CardContent></Card>
  </section>;
}
