import {useMemo,useState} from 'react';
import {Link} from 'wouter';
import {ChevronLeft,ChevronRight,Bell} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {mergeFamilyCalendar,type CalendarEntry} from '@shared/family-calendar-view';
import {NYCPS_CALENDAR_SOURCE,NYCPS_CALENDAR_REVIEWED,NYCPS_CALENDAR_SCOPE} from '@shared/family-calendar';
import type {FamilyChild,FamilyEvent} from '@shared/tuck';
import type {ParentReminder} from '@shared/parent-assistant';

const colors={closure:'border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100',schedule:'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100',milestone:'border-blue-400 bg-blue-50 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100',academic:'border-violet-400 bg-violet-50 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100',family:'border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100'};
const labels={closure:'No school',schedule:'Schedule change',milestone:'School year',academic:'Exams',family:'Your event'};
const atNoon=(date:string)=>new Date(date+'T12:00:00');
const iso=(date:Date)=>date.toLocaleDateString('en-CA');
const shortDate=(date:string)=>atNoon(date).toLocaleDateString('en-US',{month:'short',day:'numeric'});
const timeLabel=(time:string)=>new Date('2000-01-01T'+time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const occurs=(event:CalendarEntry,date:string)=>event.date<=date&&(event.endDate||event.date)>=date;
export function reminderLabel(reminder:ParentReminder) {
 if(reminder.status==='pending')return `Reminder set · ${new Intl.DateTimeFormat('en-US',{timeZone:reminder.timezone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(reminder.due_at)}`;
 return ({sending:'Sending reminder',accepted:'Waiting for WhatsApp delivery',delivered:'Delivered to WhatsApp',read:'Delivered to WhatsApp',failed:'Reminder was not delivered. Choose another time to try again.',uncertain:'Delivery could not be confirmed. Check WhatsApp before scheduling another.',expired:'Reminder expired',limit_reached:'Monthly reminder limit reached',canceled:'Reminder canceled'} as Record<string,string>)[reminder.status]||'Check reminder status';
}
export function FamilyCalendar({privateEvents=[],children=[],reminders=[],onSelectDate,onSelectEvent}:{privateEvents?:FamilyEvent[];children?:FamilyChild[];reminders?:ParentReminder[];onSelectDate?:(date:string,childId:string|null)=>void;onSelectEvent?:(entry:CalendarEntry,remind:boolean)=>void}) {
 const today=iso(new Date());
 const [month,setMonth]=useState(today.slice(0,7)),[selected,setSelected]=useState<string|null>(null),[child,setChild]=useState('all');
 const [view,setView]=useState<'month'|'agenda'>(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 767px)').matches?'agenda':'month');
 const [showOfficial,setShowOfficial]=useState(true),[onlyFamily,setOnlyFamily]=useState(false);
 const [agendaLimit,setAgendaLimit]=useState(6);
 const events=useMemo(()=>mergeFamilyCalendar(privateEvents,children,child,showOfficial).filter(e=>!onlyFamily||!!e.eventId),[privateEvents,children,child,showOfficial,onlyFamily]);
 const allUpcoming=events.filter(e=>(e.endDate||e.date)>=today),upcoming=allUpcoming.slice(0,view==='agenda'?agendaLimit:3);
 const visible=events.filter(e=>selected?occurs(e,selected):e.date<=month+'-31'&&(e.endDate||e.date)>=month+'-01'&&(month!==today.slice(0,7)||(e.endDate||e.date)>=today));
 const [year,number]=month.split('-').map(Number),first=new Date(year,number-1,1,12);first.setDate(1-first.getDay());
 const grid=Array.from({length:42},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return iso(d);});
 const move=(offset:number)=>{setMonth(iso(new Date(year,number-1+offset,1,12)).slice(0,7));setSelected(null);};
 const monthName=atNoon(month+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const selectedChildren=children.filter(c=>child==='all'||c.id===child),outsideScope=selectedChildren.length>0&&selectedChildren.every(c=>c.calendarScope==='other');
 function card(entry:CalendarEntry,compact=false) {
   const Heading=compact||view==='agenda'?'h3':'h4';
   const belongs=(r:ParentReminder)=>r.event_id===entry.eventId||!!entry.eventIds?.includes(r.event_id);
   const reminder=reminders.find(r=>belongs(r)&&r.status==='pending')||[...reminders].reverse().find(r=>belongs(r)&&r.status!=='canceled');
   return <article key={entry.id} className={`rounded-xl border border-l-4 p-4 min-w-0 ${colors[entry.kind]}`} data-calendar-entry={entry.id}>
     <div className="flex justify-between gap-3 text-xs font-medium"><time dateTime={entry.date}>{shortDate(entry.date)}{entry.endDate&&` – ${shortDate(entry.endDate)}`}{entry.eventTime&&` · ${timeLabel(entry.eventTime)}`}</time><span>{labels[entry.kind]}</span></div>
     <Heading className="font-semibold mt-2 break-words">{entry.title}</Heading>
     {!compact&&entry.detail&&<p className="text-sm mt-1 whitespace-pre-wrap break-words">{entry.detail}</p>}
     <p className="text-xs mt-2">{entry.source==='nycps'?'Official NYCPS calendar':`${children.find(c=>c.id===entry.childId)?.nickname||'Whole family'} · Private`}</p>
     {reminder&&<p className="text-xs font-medium mt-2 flex items-start gap-1"><Bell className="h-3.5 w-3.5 shrink-0"/>{reminderLabel(reminder)}</p>}
     {onSelectEvent?<div className="flex flex-wrap gap-3 mt-2">{(entry.endDate||entry.date)>=today&&<button type="button" className="min-h-11 text-sm font-medium underline" onClick={()=>onSelectEvent(entry,true)}>{reminder?.status==='pending'?'Change reminder':'Remind me'}</button>}{entry.source==='family'&&<button type="button" className="min-h-11 text-sm underline" onClick={()=>onSelectEvent(entry,false)}>Edit event</button>}</div>:compact&&<Link className="inline-flex items-center min-h-11 text-sm underline" href="/login?redirect=/family">Sign in to set a reminder</Link>}
   </article>;
 }
 return <section className="space-y-5" aria-labelledby="family-calendar-title">
   <div className="flex flex-wrap gap-3 justify-between items-center"><div><h2 id="family-calendar-title" className="text-xl font-bold">Coming up</h2><p className="text-sm text-muted-foreground">Your next dates, in one place.</p></div><div className="flex flex-wrap gap-3 items-center">{children.length>0&&<label className="text-sm flex items-center gap-2">For<select aria-label="Choose child calendar" className="min-h-11 max-w-48 border rounded-md bg-background px-3" value={child} onChange={e=>{setChild(e.target.value);setSelected(null);}}><option value="all">Whole family</option>{children.map(c=><option value={c.id} key={c.id}>{c.nickname}</option>)}</select></label>}<div className="flex gap-1" aria-label="Calendar view"><Button size="sm" variant={view==='agenda'?'secondary':'ghost'} aria-pressed={view==='agenda'} onClick={()=>{setView('agenda');setSelected(null);}}>Agenda</Button><Button size="sm" variant={view==='month'?'secondary':'ghost'} aria-pressed={view==='month'} onClick={()=>setView('month')}>Month</Button></div></div></div>
   {outsideScope&&<p className="text-sm rounded-lg border bg-muted/30 p-3">This school may follow a different calendar. Your private plans are shown; check closures with your provider.</p>}
   <details className="text-sm"><summary className="cursor-pointer min-h-11 flex items-center text-muted-foreground">Calendar filters</summary><div className="flex flex-wrap gap-4 pb-3"><label className="flex gap-2 items-center min-h-11"><input type="checkbox" checked={showOfficial} onChange={e=>setShowOfficial(e.target.checked)}/>NYCPS reference dates</label><label className="flex gap-2 items-center min-h-11"><input type="checkbox" checked={onlyFamily} onChange={e=>setOnlyFamily(e.target.checked)}/>Only my saved dates</label></div></details>
   <div className={`grid gap-3 ${view==='month'?'md:grid-cols-3':'md:grid-cols-2'}`} data-testid="family-upcoming">{upcoming.length?upcoming.map(e=>card(e,view==='month')):<div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Nothing coming up here. Add a school visit, pickup or important date whenever you need it.</div>}</div>
   {view==='agenda'&&allUpcoming.length>agendaLimit&&<Button variant="outline" onClick={()=>setAgendaLimit(limit=>limit+6)}>Show more dates</Button>}
   {view==='month'&&<div className="rounded-2xl border bg-card overflow-hidden">
     <div className="p-3 md:p-4 border-b flex flex-wrap gap-3 items-center"><Button aria-label="Previous month" variant="ghost" size="icon" onClick={()=>move(-1)}><ChevronLeft className="w-4 h-4"/></Button><h3 className="font-semibold text-center w-36" aria-live="polite">{monthName}</h3><Button aria-label="Next month" variant="ghost" size="icon" onClick={()=>move(1)}><ChevronRight className="w-4 h-4"/></Button><Button variant="ghost" size="sm" onClick={()=>{setMonth(today.slice(0,7));setSelected(null);}}>Today</Button></div>
     {view==='month'&&<div className="p-2 md:p-4"><div className="grid grid-cols-7 text-center text-xs text-muted-foreground pb-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span key={day}>{day}</span>)}</div><div className="grid grid-cols-7 border-l border-t rounded-lg overflow-hidden">{grid.map(date=>{const entries=events.filter(e=>occurs(e,date));return <button type="button" key={date} className={`min-w-0 min-h-20 md:min-h-28 p-1 border-r border-b text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary ${date.slice(0,7)!==month?'bg-muted/30 text-muted-foreground':''} ${selected===date?'ring-2 ring-inset ring-primary':''}`} aria-pressed={selected===date} aria-label={`${atNoon(date).toLocaleDateString('en-US',{dateStyle:'full'})}, ${entries.length} events`} onClick={()=>{setSelected(date);if(date.slice(0,7)!==month)setMonth(date.slice(0,7));}}><span className={`inline-flex w-7 h-7 items-center justify-center text-sm rounded-full ${date===today?'bg-primary text-primary-foreground':''}`}>{Number(date.slice(-2))}</span><span className="block space-y-1 mt-1">{entries.slice(0,2).map(entry=><span key={entry.id} className={`block truncate rounded border-l-2 px-1 text-[10px] md:text-xs ${colors[entry.kind]}`}>{entry.title}</span>)}{entries.length>2&&<span className="text-xs">+{entries.length-2} more</span>}</span></button>;})}</div></div>}
     {selected?<div className="p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2 items-center"><h3 className="text-sm font-semibold">{atNoon(selected).toLocaleDateString('en-US',{dateStyle:'full'})}</h3><div className="flex gap-3">{onSelectDate&&<button className="min-h-11 text-sm underline" onClick={()=>onSelectDate(selected,child==='all'?null:child)}>Add event on this day</button>}<button className="min-h-11 text-sm underline" onClick={()=>setSelected(null)}>Show month</button></div></div>{visible.length?<div className="grid gap-3 md:grid-cols-2" data-testid="family-month-dates">{visible.map(e=>card(e))}</div>:<p className="text-sm text-muted-foreground">No dates on this day.</p>}</div>:<p className="p-4 text-sm text-muted-foreground">Select a day to see details{onSelectDate?' or add an event.':'.'}</p>}
   </div>}
   <details className="text-xs text-muted-foreground"><summary className="cursor-pointer min-h-11 py-3">About the school calendar</summary><div className="space-y-2 pb-3"><p>{NYCPS_CALENDAR_SCOPE}</p><p>Published calendar reviewed {NYCPS_CALENDAR_REVIEWED}. Not a live emergency-closure feed. School grade bands help filter dates; individual conference times may differ. No reminders are sent unless you request them.</p><a className="inline-flex items-center min-h-11 underline" href={NYCPS_CALENDAR_SOURCE} target="_blank" rel="nofollow noopener noreferrer">View the official NYCPS source</a></div></details>
 </section>;
}
