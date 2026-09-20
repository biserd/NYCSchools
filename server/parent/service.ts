import { parentPreferencesInput, reminderInput, type ParentPreferences, PARENT_LIMITS } from '../../shared/parent-assistant';
import { TuckError } from '../tuck/store';
import type { ParentWhatsappEnvironment } from './whatsapp';

export type AssistantEnvironment = ParentWhatsappEnvironment & { AI?: Ai; PARENT_ASSISTANT_ENABLED?:string; PARENT_REMINDERS_ENABLED?:string; PARENT_REMINDER_CONTENT_SID?:string; FAMILY_CHECKOUT_ENABLED?:string; PARENT_LAUNCH_VERIFIED?:string; STRIPE_FAMILY_PREMIUM_PRICE_ID?:string };
export function assistantEnabled(env:AssistantEnvironment) { return env.PARENT_ASSISTANT_ENABLED === 'true'; }
export async function hasAssistantAccess(userId:string, env:AssistantEnvironment, now=Date.now()) {
  // Preview access is restricted to the separate staging database, never production.
  if (env.ENVIRONMENT === 'staging' && now < Date.parse(env.STAGING_EXPIRES_AT || '') && assistantEnabled(env)) return true;
  return !!await env.DB.prepare(`SELECT 1 FROM users u
    LEFT JOIN family_subscriptions f ON f.user_id=u.id
    WHERE u.id=? AND (
      (u.subscription_status='active' AND u.subscription_plan IN ('season_pass','premium')
        AND (u.subscription_expires_at IS NULL OR u.subscription_expires_at>?))
      OR (f.status IN ('active','trialing') AND f.current_period_end>?)
    ) LIMIT 1`).bind(userId,now,now).first();
}
export async function requireAssistant(userId:string, env:AssistantEnvironment) {
  if (!assistantEnabled(env)) throw new TuckError(503,'Parent Assistant is not enabled yet.');
  if (!await hasAssistantAccess(userId,env)) throw new TuckError(403,'An active paid plan is required. Active Research Pass customers are grandfathered through their original expiry.');
}
export async function preferences(userId:string, env:AssistantEnvironment):Promise<ParentPreferences> {
  const row=await env.DB.prepare('SELECT * FROM parent_preferences WHERE user_id=?').bind(userId).first<{timezone:string;quiet_start:number;quiet_end:number;reminder_consent_at:number|null;ai_consent_at:number|null}>();
  return {timezone:row?.timezone||'America/New_York',quietStart:row?.quiet_start??21,quietEnd:row?.quiet_end??8,reminderConsent:!!row?.reminder_consent_at,aiConsent:!!row?.ai_consent_at};
}
export async function savePreferences(userId:string, env:AssistantEnvironment, input:unknown) {
  const p=parentPreferencesInput.parse(input), now=Date.now();
  if (p.reminderConsent || p.aiConsent) await requireAssistant(userId,env);
  if (p.reminderConsent && !await env.DB.prepare('SELECT 1 FROM parent_whatsapp_links WHERE user_id=? AND phone IS NOT NULL AND consent_at IS NOT NULL').bind(userId).first()) throw new TuckError(409,'Connect WhatsApp first.');
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO parent_preferences(user_id,timezone,quiet_start,quiet_end,reminder_consent_at,ai_consent_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET timezone=excluded.timezone,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end,reminder_consent_at=excluded.reminder_consent_at,ai_consent_at=excluded.ai_consent_at`).bind(userId,p.timezone,p.quietStart,p.quietEnd,p.reminderConsent?now:null,p.aiConsent?now:null),
    env.DB.prepare("UPDATE parent_reminders SET status='canceled' WHERE user_id=? AND status='pending' AND ?=0").bind(userId,p.reminderConsent?1:0),
  ]);
  return p;
}
export function localParts(now:number,timezone:string) {
  return formattedParts(now,new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
}
function formattedParts(now:number,formatter:Intl.DateTimeFormat) {
  const values=Object.fromEntries(formatter.formatToParts(now).map(p=>[p.type,p.value]));
  return {date:`${values.year}-${values.month}-${values.day}`,time:`${values.hour}:${values.minute}`,hour:Number(values.hour)};
}
export function quietNow(now:number,p:ParentPreferences) {
  const hour=localParts(now,p.timezone).hour;
  return p.quietStart>p.quietEnd ? hour>=p.quietStart||hour<p.quietEnd : hour>=p.quietStart&&hour<p.quietEnd;
}
// Find all possible UTC instants, rejecting nonexistent AND ambiguous DST wall times.
export function localInstant(date:string,time:string,timezone:string) {
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new TuckError(400,'Use an exact date and 24-hour time.');
  const nominal=Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(nominal)||new Date(nominal).toISOString().slice(0,10)!==date) throw new TuckError(400,'Invalid date.');
  const found:number[]=[];
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let offset=-14*60;offset<=14*60;offset+=15) {const candidate=nominal+offset*60000,p=formattedParts(candidate,formatter);if(p.date===date&&p.time===time)found.push(candidate);}
  if(found.length!==1)throw new TuckError(400,'That local time is ambiguous or unavailable during a clock change. Choose another time.');
  return found[0];
}
export async function createReminder(userId:string,env:AssistantEnvironment,input:unknown) {
  await requireAssistant(userId,env);
  const data=reminderInput.parse(input),p=await preferences(userId,env),now=Date.now();
  if(!p.reminderConsent)throw new TuckError(409,'Opt in to reminders in settings first.');
  const due=localInstant(data.localDate,data.localTime,p.timezone);
  if(due<now+60000||due>now+366*86400000)throw new TuckError(400,'Choose a reminder between one minute and one year from now.');
  if(quietNow(due,p))throw new TuckError(400,'Choose a time outside your quiet hours.');
  const event=await env.DB.prepare('SELECT e.id,e.date FROM tuck_events e JOIN tuck_households h ON h.id=e.household_id WHERE e.id=? AND h.owner_user_id=?').bind(data.eventId,userId).first<{id:string;date:string}>();
  if(!event)throw new TuckError(404,'Event not found.');
  if(data.localDate>event.date)throw new TuckError(400,'Schedule the reminder on or before the event date.');
  const id=crypto.randomUUID();
  const row=await env.DB.prepare(`INSERT INTO parent_reminders(id,user_id,event_id,due_at,timezone,status,attempts,next_attempt_at,created_at) SELECT ?,?,?,?,?,'pending',0,?,? WHERE (SELECT count(*) FROM parent_reminders WHERE user_id=? AND status='pending')<? ON CONFLICT(user_id,event_id,due_at) DO NOTHING RETURNING id`).bind(id,userId,data.eventId,due,p.timezone,due,now,userId,PARENT_LIMITS.pendingReminders).first();
  if(!row)throw new TuckError(409,'Reminder already scheduled, or you reached the pending-reminder limit.');
  return {id,dueAt:due,timezone:p.timezone,status:'pending'};
}
export async function cancelReminder(userId:string,env:AssistantEnvironment,id:string) {
  const row=await env.DB.prepare("UPDATE parent_reminders SET status='canceled' WHERE id=? AND user_id=? AND status='pending' RETURNING id").bind(id,userId).first();
  if(!row)throw new TuckError(409,'Reminder is not pending or was not found.');
}
export async function assistantOverview(userId:string,env:AssistantEnvironment) {
  const reminders=await env.DB.prepare('SELECT r.id,r.event_id,r.due_at,r.timezone,r.status,e.title FROM parent_reminders r JOIN tuck_events e ON e.id=r.event_id WHERE r.user_id=? ORDER BY r.due_at DESC LIMIT 100').bind(userId).all();
  return {enabled:assistantEnabled(env),entitled:await hasAssistantAccess(userId,env),deliveryEnabled:env.PARENT_REMINDERS_ENABLED==='true',preferences:await preferences(userId,env),reminders:reminders.results,limits:PARENT_LIMITS};
}
