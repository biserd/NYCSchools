import {useState} from 'react';
import {Link} from 'wouter';
import {useMutation,useQuery} from '@tanstack/react-query';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {apiRequest} from '@/lib/queryClient';
import {useFamilyAssistant,useRefreshFamily} from '@/hooks/useFamily';
import {ParentWhatsAppConnection} from './ParentWhatsAppConnection';
import type {CalendarEntry} from '@shared/family-calendar-view';
import type {FamilyChild} from '@shared/tuck';
import {trackEvent} from '@/lib/analytics';
const today=()=>new Date().toLocaleDateString('en-CA');
function dayBefore(date:string){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()-1);return d.toLocaleDateString('en-CA');}
export type FamilyComposerSeed={entry?:CalendarEntry;date?:string;childId?:string|null;remind?:boolean;test?:boolean};
export function FamilyEventComposer({userId,children,seed,onClose,onSaved}:{userId:string;children:FamilyChild[];seed:FamilyComposerSeed;onClose:()=>void;onSaved:(message:string)=>void}) {
 const status=useFamilyAssistant(userId),refresh=useRefreshFamily(userId),entry=seed.entry;
 const connected=useQuery<{connected:boolean}>({queryKey:['parent-whatsapp',userId],gcTime:0,queryFn:async()=>(await apiRequest('GET','/api/tuck/whatsapp')).json()});
 const pending=status.data?.reminders.find(r=>(r.event_id===entry?.eventId||!!entry?.eventIds?.includes(r.event_id))&&r.status==='pending');
 const zone=status.data?.preferences.timezone||'America/New_York';
 const parts=(instant:number)=>{const values=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(p=>[p.type,p.value]));return {date:`${values.year}-${values.month}-${values.day}`,time:`${values.hour}:${values.minute}`};};
 const pendingParts=pending?parts(pending.due_at):null;
 const [testParts]=useState(()=>parts(Date.now()+6*60000));
 const initialDate=entry?.date||seed.date||today(),nowParts=parts(Date.now()+60000),initialMorning=entry?.eventTime&&entry.eventTime<'09:00'?entry.eventTime:'09:00';
 const initialPreset=entry?.endDate&&initialDate<nowParts.date?'last':dayBefore(initialDate)+'T09:00'>nowParts.date+'T'+nowParts.time?'before':initialDate+'T'+initialMorning>nowParts.date+'T'+nowParts.time?'morning':'custom';
 const [requestId]=useState(()=>crypto.randomUUID());
 const [title,setTitle]=useState(entry?.title||(seed.test?'Check my WhatsApp reminder':'')),[date,setDate]=useState(entry?.date||seed.date||(seed.test?testParts.date:today())),[endDate,setEndDate]=useState(entry?.endDate||''),[time,setTime]=useState(entry?.eventTime||(seed.test?testParts.time:'')),[detail,setDetail]=useState(entry?.source==='family'?entry.detail||'':''),[childId,setChildId]=useState(entry?.childId||seed.childId||'');
 const [remind,setRemind]=useState(!!seed.remind||!!pending),[reminderTouched,setReminderTouched]=useState(false),[preset,setPreset]=useState(pending||seed.test?'custom':initialPreset),[reminderDate,setReminderDate]=useState(pendingParts?.date||testParts.date),[reminderTime,setReminderTime]=useState(pendingParts?.time||testParts.time);
 const official=entry?.source==='nycps',paid=!!status.data?.entitled;
 const reminder=preset==='custom'?{localDate:reminderDate,localTime:reminderTime}:preset==='last'?{localDate:endDate||date,localTime:'09:00'}:preset==='start'?{localDate:date,localTime:time||'09:00'}:preset==='morning'?{localDate:date,localTime:time&&time<'09:00'?time:'09:00'}:{localDate:dayBefore(date),localTime:'09:00'};
 const requestsReminder=remind&&(reminderTouched||!!seed.remind||!entry?.eventId);
 const needsConnection=requestsReminder&&paid&&!connected.data?.connected;
 const deliveryPaused=status.data?.deliveryEnabled===false||status.data?.enabled===false;
 const save=useMutation({mutationFn:async(calendarOnly:boolean)=>{
   const reminderChange=calendarOnly?null:entry?.eventId&&!reminderTouched&&!seed.remind?undefined:remind&&paid?reminder:null;
   const response=await apiRequest(entry?.eventId?'PUT':'POST',`/api/tuck/events${entry?.eventId?'/'+entry.eventId:''}`,{requestId,title,date,endDate:endDate||null,eventTime:time||null,timezone:entry?.timezone||zone,childId:childId||null,sourceId:entry?.sourceId||null,detail,reminder:reminderChange});return response.json() as Promise<{message:string;reminderDueAt:number|null}>;
 },onSuccess:async result=>{trackEvent('family_event_saved',{reminder_scheduled:!!result.reminderDueAt,source:official?'nycps':'family',timed:!!time});await refresh();onSaved(result.message);onClose();}});
 const remove=useMutation({mutationFn:async()=>{await apiRequest('DELETE',`/api/tuck/events/${entry!.eventId}`);},onSuccess:async()=>{await refresh();onSaved('Event and its reminders removed.');onClose();}});
 const busy=save.isPending||remove.isPending;
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="w-[calc(100%_-_1rem)] max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{official?'Remind me about this date':entry?.eventId?'Edit event':'Add an event'}</DialogTitle><DialogDescription>{official?'The published date stays in your calendar. Set a reminder without adding a duplicate.':'A date, an optional time, and a reminder if you want one.'}</DialogDescription></DialogHeader>
   <form className="space-y-4" onSubmit={e=>{e.preventDefault();save.mutate(false);}}>
     {official?<div className="rounded-lg border bg-muted/30 p-3"><p className="font-semibold">{title}</p><p className="text-sm">{new Date(date+'T12:00:00').toLocaleDateString('en-US',{dateStyle:'medium'})}{endDate&&` to ${new Date(endDate+'T12:00:00').toLocaleDateString('en-US',{dateStyle:'medium'})}`}</p></div>:<>
       <div><Label htmlFor="family-event-title">What’s happening?</Label><Input id="family-event-title" autoFocus required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="School visit, pickup, application deadline…"/></div>
       <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="family-event-date">Date</Label><Input id="family-event-date" type="date" required value={date} onChange={e=>{if(pending&&e.target.value&&date){const delta=Date.parse(e.target.value+'T12:00:00Z')-Date.parse(date+'T12:00:00Z');const old=reminder.localDate;if(old){setReminderDate(new Date(Date.parse(old+'T12:00:00Z')+delta).toISOString().slice(0,10));setReminderTime(reminder.localTime);setPreset('custom');setReminderTouched(true);}}setDate(e.target.value);}}/></div><div><Label htmlFor="family-event-time">Time <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="family-event-time" type="time" value={time} onChange={e=>{setTime(e.target.value);if(pending)setReminderTouched(true);}}/></div></div>
       <details><summary className="cursor-pointer min-h-11 py-2 text-sm text-muted-foreground">Child, notes or end date (optional)</summary><div className="space-y-3 pt-2">
         {children.length>0&&<div><Label htmlFor="family-event-child">For</Label><select id="family-event-child" className="w-full min-h-11 rounded-md border bg-background px-3" value={childId} onChange={e=>setChildId(e.target.value)}><option value="">Whole family</option>{children.map(c=><option key={c.id} value={c.id}>{c.nickname}</option>)}</select></div>}
         <div><Label htmlFor="family-event-end">End date</Label><Input id="family-event-end" type="date" min={date} value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
         <div><Label htmlFor="family-event-notes">Notes</Label><Input id="family-event-notes" maxLength={1000} value={detail} onChange={e=>setDetail(e.target.value)}/></div>
       </div></details>
     </>}
     <div className="rounded-lg border p-3 space-y-3">
       <label className="flex gap-3 items-center min-h-11"><input type="checkbox" className="w-5 h-5" checked={remind} onChange={e=>{setRemind(e.target.checked);setReminderTouched(true);}}/><span className="font-medium text-sm">Remind me on WhatsApp</span></label>
       {remind&&(!paid?<p className="text-sm">WhatsApp reminders are included with membership. <Link href="/pricing" className="text-primary underline">View membership</Link>. You can save this event without a reminder.</p>:<>
         <Label htmlFor="family-reminder-when">When should we remind you?</Label><select id="family-reminder-when" className="w-full min-h-11 rounded-md border bg-background px-3" value={preset} onChange={e=>{setPreset(e.target.value);setReminderTouched(true);}}><option value="before">Day before at 9am</option><option value="morning">Morning of the event</option>{time&&<option value="start">When it starts</option>}{endDate&&<option value="last">Last day at 9am</option>}<option value="custom">Choose a time</option></select>
         {preset==='custom'&&<div className="grid grid-cols-2 gap-3"><div><Label htmlFor="family-reminder-date">Reminder date</Label><Input id="family-reminder-date" type="date" required value={reminderDate} onChange={e=>{setReminderDate(e.target.value);setReminderTouched(true);}}/></div><div><Label htmlFor="family-reminder-time">Reminder time</Label><Input id="family-reminder-time" type="time" required value={reminderTime} onChange={e=>{setReminderTime(e.target.value);setReminderTouched(true);}}/></div></div>}
         <p className="text-xs text-muted-foreground">{reminder.localDate&&`${new Date(reminder.localDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} at ${new Date('2000-01-01T'+reminder.localTime).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} · `}{zone}. Reminders may arrive a few minutes after the selected time.</p>
         {needsConnection&&<ParentWhatsAppConnection userId={userId}/>}
         {deliveryPaused&&requestsReminder&&<p role="status" className="text-sm">WhatsApp delivery is temporarily paused. You can save the event without a reminder.</p>}
       </>)}
       {!remind&&<p className="text-xs text-muted-foreground">{entry?.eventId&&!reminderTouched?'Existing reminder settings stay unchanged.':`Calendar only. No WhatsApp message will be sent.${pending?' Saving will cancel the existing reminder.':''}`}</p>}
     </div>
     {(save.isError||remove.isError)&&<p role="alert" className="text-sm text-destructive">{save.error?.message||remove.error?.message}</p>}
     <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy||needsConnection||requestsReminder&&(!paid||deliveryPaused)}>{busy?'Saving…':requestsReminder?'Save event & reminder':'Save event'}</Button>{requestsReminder&&(!paid||needsConnection||deliveryPaused)&&<Button type="button" variant="outline" disabled={busy} onClick={e=>{if(e.currentTarget.form?.reportValidity())save.mutate(true);}}>Save without reminder</Button>}<Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button></div>
     {entry?.eventId&&entry.source==='family'&&<button type="button" className="min-h-11 text-sm underline text-destructive" disabled={busy} onClick={()=>{if(window.confirm('Remove this event and its reminders?'))remove.mutate();}}>Remove event</button>}
   </form>
 </DialogContent></Dialog>;
}
