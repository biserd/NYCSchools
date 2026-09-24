import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { NYCPS_2026_27_EVENTS, NYCPS_CALENDAR_REVIEWED, NYCPS_CALENDAR_SCOPE, NYCPS_CALENDAR_SOURCE, type FamilyCalendarKind } from '@shared/family-calendar';

type PrivateEvent = { id: string; date: string; title: string; detail: string; childId: string | null };
type CalendarEvent = { id: string; date: string; endDate?: string; title: string; detail?: string; kind: FamilyCalendarKind | 'family'; source: 'nycps' | 'family'; childId?: string | null };
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const colors: Record<CalendarEvent['kind'], string> = {
  closure: 'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  schedule: 'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200',
  milestone: 'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  academic: 'border-violet-400 bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-200',
  family: 'border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-950/40 dark:text-teal-200',
};
const labels: Record<CalendarEvent['kind'], string> = { closure: 'No school', schedule: 'Schedule change', milestone: 'School year', academic: 'Exams', family: 'Your family' };
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function atNoon(date: string) { return new Date(`${date}T12:00:00`); }
function monthTitle(month: string) { return atNoon(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
function moveMonth(month: string, offset: number) { const [year, number] = month.split('-').map(Number); return iso(new Date(year, number - 1 + offset, 1, 12)).slice(0, 7); }
function daysInGrid(month: string) { const [year, number] = month.split('-').map(Number); const first = new Date(year, number - 1, 1, 12); const start = new Date(first); start.setDate(1 - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const day = new Date(start); day.setDate(start.getDate() + i); return iso(day); }); }
function occurs(event: CalendarEvent, date: string) { return event.date <= date && date <= (event.endDate || event.date); }

export function FamilyCalendar({ privateEvents = [], children = [], onSelectDate }: { privateEvents?: PrivateEvent[]; children?: { id: string; nickname: string }[]; onSelectDate?: (date: string, childId: string | null) => void }) {
  const today = iso(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | CalendarEvent['kind']>('all');
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [childFilter, setChildFilter] = useState('all');
  const [showNycps, setShowNycps] = useState(true);
  const events = useMemo<CalendarEvent[]>(() => [
    ...NYCPS_2026_27_EVENTS.map(e => ({ id: e.id, date: e.date, endDate: e.endDate, title: e.title, detail: e.note, kind: e.kind, source: 'nycps' as const })),
    ...privateEvents.map(e => ({ id: e.id, date: e.date, title: e.title, detail: e.detail, kind: 'family' as const, source: 'family' as const, childId: e.childId })),
  ].sort((a, b) => a.date.localeCompare(b.date)), [privateEvents]);
  const filteredEvents = events.filter(e => (filter === 'all' || e.kind === filter) && (e.source !== 'nycps' || showNycps) && (childFilter === 'all' || e.source === 'nycps' || e.childId === null || e.childId === childFilter));
  const visible = filteredEvents.filter(e => selectedDate ? occurs(e, selectedDate) : e.date.slice(0, 7) === month || !!e.endDate && e.date <= `${month}-31` && e.endDate >= `${month}-01`);
  const grid = daysInGrid(month);
  const next = filteredEvents.find(e => (e.endDate || e.date) >= today);
  return <section className="space-y-5" aria-labelledby="family-calendar-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-300">Your family dashboard</p><h2 id="family-calendar-title" className="text-2xl md:text-3xl font-bold mt-1">The school year, at a glance</h2><p className="text-sm text-muted-foreground mt-1">NYCPS dates and your own plans in one place.</p></div>
      <div className="rounded-xl border bg-background px-4 py-2 text-sm"><strong>{next ? atNoon(next.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No upcoming dates'}</strong><span className="block text-muted-foreground max-w-52 truncate">{next?.title || 'Add a family event'}</span></div>
    </div>
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => { setMonth(moveMonth(month, -1)); setSelectedDate(null); }}><ChevronLeft className="w-4 h-4" /></Button><h3 className="font-semibold text-lg min-w-40 text-center" aria-live="polite">{monthTitle(month)}</h3><Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => { setMonth(moveMonth(month, 1)); setSelectedDate(null); }}><ChevronRight className="w-4 h-4" /></Button><Button type="button" variant="ghost" size="sm" onClick={() => { setMonth(today.slice(0, 7)); setSelectedDate(today); }}>Today</Button></div>
        <div className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Calendar view"><Button type="button" size="sm" variant={view === 'month' ? 'secondary' : 'ghost'} onClick={() => setView('month')}>Month</Button><Button type="button" size="sm" variant={view === 'agenda' ? 'secondary' : 'ghost'} onClick={() => setView('agenda')}>Agenda</Button></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b" aria-label="Filter dates">{(['all', 'closure', 'schedule', 'milestone', 'academic', 'family'] as const).map(kind => <Button key={kind} type="button" size="sm" variant={filter === kind ? 'default' : 'outline'} onClick={() => setFilter(kind)}>{kind === 'all' ? 'Everything' : labels[kind]}</Button>)}<label className="flex items-center gap-2 text-sm ml-auto"><input type="checkbox" checked={showNycps} onChange={e => setShowNycps(e.target.checked)} />NYCPS dates</label>{children.length > 0 && <label className="text-sm flex items-center gap-2">Calendar<select aria-label="Choose child calendar" className="min-h-11 rounded-md border bg-background px-2" value={childFilter} onChange={e => setChildFilter(e.target.value)}><option value="all">Whole family</option>{children.map(child => <option key={child.id} value={child.id}>{child.nickname}</option>)}</select></label>}</div>
      {view === 'month' && <div className="p-2 md:p-4"><div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground pb-2">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="grid grid-cols-7 border-l border-t rounded-lg overflow-hidden">{grid.map(date => { const dayEvents = filteredEvents.filter(e => occurs(e, date)); return <button key={date} type="button" aria-label={`${atNoon(date).toLocaleDateString('en-US', { dateStyle: 'full' })}, ${dayEvents.length} events`} aria-pressed={selectedDate === date} className={`min-h-20 md:min-h-28 border-r border-b p-1.5 text-left hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${date.slice(0, 7) === month ? '' : 'bg-muted/30 text-muted-foreground'} ${selectedDate === date ? 'ring-2 ring-inset ring-primary' : ''}`} onClick={() => { setSelectedDate(date); if (date.slice(0, 7) !== month) setMonth(date.slice(0, 7)); }}><span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${date === today ? 'bg-primary text-primary-foreground font-bold' : ''}`}>{Number(date.slice(-2))}</span><span className="block space-y-1 mt-1">{dayEvents.slice(0, 2).map(e => <span key={e.id} className={`block truncate rounded border-l-2 px-1 text-[10px] md:text-xs ${colors[e.kind]}`}>{e.title}</span>)}{dayEvents.length > 2 && <span className="block text-xs text-muted-foreground">+{dayEvents.length - 2} more</span>}</span></button>; })}</div></div>}
      <div className="border-t p-4 md:p-5"><div className="flex flex-wrap justify-between items-center gap-2"><h3 className="font-semibold">{selectedDate ? atNoon(selectedDate).toLocaleDateString('en-US', { dateStyle: 'full' }) : `${monthTitle(month)} dates`}</h3><div className="flex gap-3 items-center">{selectedDate && onSelectDate && <button type="button" className="text-sm underline min-h-11" onClick={() => { onSelectDate(selectedDate, childFilter === 'all' ? null : childFilter); document.getElementById('family-event-form')?.scrollIntoView({behavior:'smooth',block:'center'}); }}>Add family event</button>}{selectedDate && <button type="button" className="text-sm underline min-h-11" onClick={() => setSelectedDate(null)}>Show full month</button>}</div></div>{visible.length === 0 ? <p className="text-sm text-muted-foreground mt-3">No dates in this view. Move to another month or add your own.</p> : <ol className="mt-3 grid gap-2 md:grid-cols-2">{visible.map(e => <li key={e.id} className={`rounded-lg border-l-4 p-3 ${colors[e.kind]}`}><div className="flex justify-between gap-2 text-xs font-medium"><time dateTime={e.date}>{atNoon(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.endDate && `–${atNoon(e.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</time><span>{labels[e.kind]}</span></div><p className="font-semibold mt-1">{e.title}</p>{e.detail && <p className="text-xs mt-1">{e.detail}</p>}{e.source === 'family' ? <p className="text-xs mt-1">{children.find(c => c.id === e.childId)?.nickname || 'Whole family'} · Private</p> : <p className="text-xs mt-1">Official NYCPS district calendar</p>}</li>)}</ol>}</div>
    </div>
    <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2"><p className="font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4" />About these dates</p><p>{NYCPS_CALENDAR_SCOPE}</p><p>All dated entries in the published 2026–27 NYCPS calendar were reviewed {NYCPS_CALENDAR_REVIEWED}. This is a static official-calendar layer, not a live school-announcement feed; individual conferences and emergency closures may differ. Your family events are private and do not automatically send reminders.</p><a className="inline-flex min-h-11 items-center gap-1 underline" href={NYCPS_CALENDAR_SOURCE} target="_blank" rel="nofollow noopener noreferrer">Check the NYCPS source <ExternalLink className="w-3 h-3" /></a></div>
    {!onSelectDate && <Button variant="outline" asChild><Link href="/login?redirect=/family">Sign in to add your family dates</Link></Button>}
  </section>;
}
