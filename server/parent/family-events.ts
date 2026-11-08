import {familyEventInput,type FamilyEvent} from '../../shared/tuck';
import {NYCPS_2026_27_EVENTS,NYCPS_CALENDAR_SOURCE} from '../../shared/family-calendar';
import {officialSourceId} from '../../shared/family-calendar-view';
import {PARENT_LIMITS} from '../../shared/parent-assistant';
import {TuckError} from '../tuck/store';
import {authorizeRequestedReminder,localInstant,preferences,quietNow,requireAssistant,requireReminderDelivery,type AssistantEnvironment} from './service';
import {recordFamilyActivity} from './activity';

type StoredEvent={id:string;household_id:string;child_id:string|null;title:string;date:string;end_date:string|null;event_time:string|null;timezone:string;source_id:string|null;detail:string};
export const eventProjection=(e:StoredEvent):FamilyEvent=>({id:e.id,childId:e.child_id,title:e.title,date:e.date,endDate:e.end_date,eventTime:e.event_time,timezone:e.timezone,sourceId:officialSourceId({sourceId:e.source_id,title:e.title,date:e.date,detail:e.detail}),detail:e.detail});

export async function saveFamilyEvent(userId:string,env:AssistantEnvironment,input:unknown,eventId?:string,options:{draftId?:string;channel?:'web'|'whatsapp'}={}) {
  const data=familyEventInput.parse(input),now=Date.now();
  const publicEvent=data.sourceId?NYCPS_2026_27_EVENTS.find(e=>e.id===data.sourceId):null;
  if(data.sourceId&&!publicEvent)throw new TuckError(400,'That official calendar date is unavailable. Refresh the calendar.');
  await env.DB.prepare('INSERT OR IGNORE INTO tuck_households(id,owner_user_id) VALUES (?,?)').bind(crypto.randomUUID(),userId).run();
  const household=await env.DB.prepare('SELECT id FROM tuck_households WHERE owner_user_id=?').bind(userId).first<string>('id');
  if(!household)throw new TuckError(503,'Your calendar could not open. Please try again.');
  const own=eventId?await env.DB.prepare('SELECT * FROM tuck_events WHERE id=? AND household_id=?').bind(eventId,household).first<StoredEvent>():null;
  if(eventId&&!own)throw new TuckError(404,'Event not found.');
  if(own?.source_id&&data.sourceId!==own.source_id)throw new TuckError(400,'Official calendar dates keep their source. Add a separate family event instead.');
  if(data.childId&&!await env.DB.prepare('SELECT 1 FROM tuck_children WHERE id=? AND household_id=?').bind(data.childId,household).first())throw new TuckError(404,'Child not found.');

  let id=eventId||data.requestId||crypto.randomUUID(),relatedIds:string[]=[];
  if(publicEvent){
    // Reuse attributed legacy IDs, preserving their existing reminder relationships.
    const candidates=await env.DB.prepare('SELECT * FROM tuck_events WHERE household_id=? AND (source_id=? OR (source_id IS NULL AND date=? AND instr(detail,?)=1)) ORDER BY created_at,id')
      .bind(household,publicEvent.id,publicEvent.date,`Source: ${NYCPS_CALENDAR_SOURCE}`).all<StoredEvent>();
    const verified=candidates.results.filter(e=>officialSourceId(eventProjection(e))===publicEvent.id);
    relatedIds=verified.map(e=>e.id);
    const legacy=verified.find(e=>e.source_id===publicEvent.id)||verified[0];
    if(legacy)id=legacy.id;
    else{
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${household}:${publicEvent.id}`))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
      id=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20)}`;
    }
  }
  relatedIds=Array.from(new Set([id,...relatedIds]));
  const collision=await env.DB.prepare('SELECT household_id,source_id FROM tuck_events WHERE id=?').bind(id).first<{household_id:string;source_id:string|null}>();
  if(collision&&collision.household_id!==household)throw new TuckError(404,'Event not found.');
  if(collision?.source_id&&collision.source_id!==publicEvent?.id)throw new TuckError(400,'Official calendar dates keep their source. Add a separate family event instead.');
  const title=publicEvent?.title||data.title,date=publicEvent?.date||data.date,endDate=publicEvent?.endDate||data.endDate;
  if(endDate&&endDate<date)throw new TuckError(400,'End date must be on or after the start date.');
  const time=publicEvent?null:data.eventTime;
  if(time)localInstant(date,time,data.timezone); // Validate DST wall times, not just shape.
  const existing=await env.DB.prepare('SELECT date,end_date,event_time FROM tuck_events WHERE id=? AND household_id=?').bind(id,household).first<{date:string;end_date:string|null;event_time:string|null}>();
  if(existing&&data.reminder===undefined&&(existing.date!==date||existing.event_time!==time)){
    if(await env.DB.prepare("SELECT 1 FROM parent_reminders WHERE event_id=? AND user_id=? AND status='pending'").bind(id,userId).first())throw new TuckError(409,'Review the reminder when changing this event’s date or time.');
  }
  let due:number|null=null,reminderTimezone=data.timezone;
  if(data.reminder){
    await requireAssistant(userId,env);requireReminderDelivery(env);const p=await preferences(userId,env);reminderTimezone=p.timezone;
    due=localInstant(data.reminder.localDate,data.reminder.localTime,p.timezone);
    if(due<now+60000||due>now+366*86400000)throw new TuckError(400,'Choose a reminder at least a minute from now and within the next year.');
    if(data.reminder.localDate>(endDate||date))throw new TuckError(400,'Choose a reminder on or before the event ends.');
    if(time&&!endDate&&due>localInstant(date,time,data.timezone))throw new TuckError(400,'Choose a reminder before the event starts.');
    if(quietNow(due,p))throw new TuckError(400,`That reminder falls in your quiet hours. Choose a time after ${p.quietEnd}:00 or adjust quiet hours in Settings.`);
    await authorizeRequestedReminder(userId,env,now);
    const same=await env.DB.prepare('SELECT status,message_sid FROM parent_reminders WHERE user_id=? AND event_id=? AND due_at=?').bind(userId,id,due).first<{status:string;message_sid:string|null}>();
    if(same&&same.status!=='pending'&&!(same.status==='canceled'&&!same.message_sid))throw new TuckError(409,'A reminder was already sent or attempted for that time. Choose a new time to avoid a duplicate.');
  }
  if(data.reminder!==undefined&&await env.DB.prepare("SELECT 1 FROM parent_reminders WHERE user_id=? AND event_id=? AND status='sending'").bind(userId,id).first())throw new TuckError(409,'This reminder is being sent. Please wait a moment before changing it.');
  const guard=options.draftId?'EXISTS(SELECT 1 FROM parent_drafts WHERE id=? AND user_id=? AND expires_at>? AND confirmed_at IS NULL)':'1';
  const guardArgs=options.draftId?[options.draftId,userId,now]:[];
  const batch=[env.DB.prepare(`INSERT INTO tuck_events(id,household_id,child_id,title,date,end_date,event_time,timezone,source_id,detail)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard}
    ON CONFLICT(id) DO UPDATE SET child_id=excluded.child_id,title=excluded.title,date=excluded.date,end_date=excluded.end_date,event_time=excluded.event_time,timezone=excluded.timezone,source_id=excluded.source_id,detail=excluded.detail
    WHERE tuck_events.household_id=excluded.household_id AND ${guard}`)
    .bind(id,household,publicEvent?null:data.childId,title,date,endDate||null,time,data.timezone,publicEvent?.id||null,publicEvent?`Source: ${NYCPS_CALENDAR_SOURCE}\n${publicEvent.note||''}`:data.detail,...guardArgs,...guardArgs)];
  if(data.reminder!==undefined){
    for(let offset=0;offset<relatedIds.length;offset+=90){const ids=relatedIds.slice(offset,offset+90);batch.push(env.DB.prepare(`UPDATE parent_reminders SET status='canceled' WHERE user_id=? AND event_id IN (${ids.map(()=>'?').join(',')}) AND status='pending' AND (? IS NULL OR event_id!=? OR due_at!=?) AND ${guard}`).bind(userId,...ids,due,id,due,...guardArgs));}
    if(due!==null)batch.push(env.DB.prepare(`INSERT INTO parent_reminders(id,user_id,event_id,due_at,timezone,status,attempts,next_attempt_at,created_at)
      SELECT ?,?,?,CASE WHEN (SELECT count(*) FROM parent_reminders WHERE user_id=? AND status='pending' AND event_id!=?)>=? THEN NULL ELSE ? END,?,'pending',0,?,?
      WHERE EXISTS(SELECT 1 FROM tuck_events WHERE id=? AND household_id=?) AND ${guard}
      ON CONFLICT(user_id,event_id,due_at) DO UPDATE SET status='pending',attempts=CASE WHEN parent_reminders.status='canceled' THEN 0 ELSE parent_reminders.attempts END,
        next_attempt_at=CASE WHEN parent_reminders.status='canceled' THEN excluded.next_attempt_at ELSE parent_reminders.next_attempt_at END,
        created_at=CASE WHEN parent_reminders.status='canceled' THEN excluded.created_at ELSE parent_reminders.created_at END,
        failure_code=NULL,claim_at=CASE WHEN parent_reminders.status='canceled' THEN NULL ELSE parent_reminders.claim_at END
      WHERE parent_reminders.status='pending' OR (parent_reminders.status='canceled' AND parent_reminders.message_sid IS NULL)`)
      .bind(options.draftId||crypto.randomUUID(),userId,id,userId,id,PARENT_LIMITS.pendingReminders,due,reminderTimezone,due,now,id,household,...guardArgs));
  }
  if(options.draftId)batch.push(env.DB.prepare('UPDATE parent_drafts SET confirmed_at=? WHERE id=? AND user_id=? AND confirmed_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM tuck_events WHERE id=? AND household_id=?)').bind(now,options.draftId,userId,now,id,household));
  try{await env.DB.batch(batch);}catch(error){
    if(error instanceof Error&&/NOT NULL constraint failed: parent_reminders.due_at/.test(error.message))throw new TuckError(409,'You have 100 upcoming reminders. Cancel one before adding another. Nothing was changed.');
    throw error;
  }
  const saved=await env.DB.prepare('SELECT id FROM tuck_events WHERE id=? AND household_id=?').bind(id,household).first();
  if(!saved)throw new TuckError(409,'This draft has expired or was discarded. Nothing was saved.');
  await recordFamilyActivity(env.DB,userId,'event_saved',`${id}:${now}`,options.channel||'web',now);
  if(due!==null)await recordFamilyActivity(env.DB,userId,'reminder_scheduled',`${id}:${due}`,options.channel||'web',now);
  return {id,eventId:id,childId:publicEvent?null:data.childId,title,date,endDate:endDate||null,eventTime:time,timezone:data.timezone,sourceId:publicEvent?.id||null,detail:data.detail,reminderDueAt:due,reminderTimezone,message:due!==null?`Saved. WhatsApp reminder scheduled for ${new Intl.DateTimeFormat('en-US',{timeZone:reminderTimezone,dateStyle:'medium',timeStyle:'short'}).format(due)}.`:data.reminder===null?'Event saved. No WhatsApp reminder is scheduled.':'Event saved.'};
}

export async function listFamilyEvents(userId:string,env:AssistantEnvironment) {
  const rows=await env.DB.prepare('SELECT e.* FROM tuck_events e JOIN tuck_households h ON h.id=e.household_id WHERE h.owner_user_id=? ORDER BY e.date,e.event_time').bind(userId).all<StoredEvent>();
  return rows.results.map(eventProjection);
}
