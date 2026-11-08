// Shared with isolated tests; no Durable Object or model call is needed here.
import {mergeFamilyCalendar,schoolCalendarScope} from '../../shared/family-calendar-view';
import {NYCPS_2026_27_EVENTS,NYCPS_CALENDAR_SCOPE,NYCPS_CALENDAR_SOURCE,NYCPS_CALENDAR_REVIEWED} from '../../shared/family-calendar';
import type {FamilyChild} from '../../shared/tuck';
import {listFamilyEvents} from './family-events';
import {localInstant,localParts,preferences,quietNow,requireReminderDelivery,type AssistantEnvironment} from './service';
import {TuckError} from '../tuck/store';
import {stageDraft} from './assistant';
export function agentTurnOutcome(outputs:Record<string,unknown>[]) {
 const school=[...outputs].reverse().find(o=>o.kind==='school-results');
 return {outcome:outputs.some(o=>o.kind==='tool-error')?'tool_error':outputs.some(o=>o.kind==='school-clarification')?'clarification':'ok',tool:String(outputs.at(-1)?.kind||'conversation'),resultCount:school&&Array.isArray(school.schools)?school.schools.length:0};
}
export async function familyCalendarEvidence(userId:string,env:AssistantEnvironment,input:{fromDate?:string;toDate?:string;limit?:number;childId?:string|null;schoolDbn?:string|null}={}) {
 const p=await preferences(userId,env),today=localParts(Date.now(),p.timezone).date;
 const from=input.fromDate||today,to=input.toDate||new Date(Date.parse(from+'T12:00:00Z')+90*86400000).toISOString().slice(0,10);
 if(to<from)throw new TuckError(400,'Choose an end date on or after the start date.');
 const children=(await env.DB.prepare(`SELECT c.id,c.nickname,c.school_dbn schoolDbn,s.name schoolName,s.grade_band gradeBand,s.district FROM tuck_children c JOIN tuck_households h ON h.id=c.household_id LEFT JOIN schools s ON s.dbn=c.school_dbn WHERE h.owner_user_id=?`).bind(userId).all<FamilyChild>()).results.map(c=>({...c,calendarScope:c.schoolDbn&&c.gradeBand&&c.district!==null&&c.district!==undefined?schoolCalendarScope({dbn:c.schoolDbn,gradeBand:c.gradeBand,district:c.district}):'unknown' as const}));
 if(input.childId&&!children.some(c=>c.id===input.childId))throw new TuckError(404,'Child not found.');
 let selected=children;
 if(input.schoolDbn){
   const school=await env.DB.prepare('SELECT dbn,name,grade_band,district FROM schools WHERE dbn=?').bind(input.schoolDbn.toUpperCase()).first<{dbn:string;name:string;grade_band:string;district:number}>();
   if(!school)throw new TuckError(404,'School not found.');
   selected=[{id:input.childId||'school-reference',nickname:'School reference',schoolDbn:school.dbn,schoolName:school.name,schoolUrl:null,gradeBand:school.grade_band,district:school.district,calendarScope:schoolCalendarScope({dbn:school.dbn,gradeBand:school.grade_band,district:school.district})}];
 }
 const privateEvents=input.schoolDbn&&!children.some(c=>c.schoolDbn===input.schoolDbn)?[]:await listFamilyEvents(userId,env);
 const reminders=(await env.DB.prepare('SELECT event_id,due_at,timezone,status FROM parent_reminders WHERE user_id=? ORDER BY due_at').bind(userId).all<{event_id:string;due_at:number;timezone:string;status:string}>()).results;
 const entries=mergeFamilyCalendar(privateEvents,selected,input.childId||(input.schoolDbn?selected[0].id:'all')).filter(e=>e.date<=to&&(e.endDate||e.date)>=from).slice(0,Math.min(input.limit||10,30));
 return {kind:'calendar-events',timezone:p.timezone,range:{from,to},events:entries.map(e=>({...e,reminders:reminders.filter(r=>r.event_id===e.eventId||e.eventIds?.includes(r.event_id)).map(r=>({dueAt:r.due_at,timezone:r.timezone,status:r.status})),sourceUrl:e.source==='nycps'?NYCPS_CALENDAR_SOURCE:null})),children:children.map(c=>({id:c.id,nickname:c.nickname,schoolName:c.schoolName,calendarScope:c.calendarScope})),scope:NYCPS_CALENDAR_SCOPE,reviewed:NYCPS_CALENDAR_REVIEWED,limitations:'Published district-calendar reference plus this account’s private dates. Not a live emergency or individual-school feed. A date in the calendar does not imply a WhatsApp reminder. Grade bands describe the school, not the child’s enrolled grade. Confirm individual conference times with the school.'};
}
export type AgentCalendarDraft={title:string;eventDate:string;reminderDate:string|null;reminderTime:string|null;eventTime:string|null;endDate:string|null;eventId:string|null;childId:string|null;sourceId:string|null;reminderMode?:'keep'|'set'|'none';detail?:string|null;clearTime?:boolean;clearEndDate?:boolean;clearChild?:boolean};
export async function prepareAgentCalendarDraft(userId:string,env:AssistantEnvironment,input:AgentCalendarDraft) {
 const p=await preferences(userId,env),today=localParts(Date.now(),p.timezone).date;
 const owned=await listFamilyEvents(userId,env),existing=input.eventId?owned.find(e=>e.id===input.eventId):null;
 if(input.eventId&&!existing)throw new TuckError(404,'Event not found.');
 const sourceId=input.sourceId||existing?.sourceId||null,official=sourceId?NYCPS_2026_27_EVENTS.find(e=>e.id===sourceId):null;
 if(sourceId&&!official)throw new TuckError(400,'Official calendar entry not found.');
 const date=official?.date||input.eventDate,endDate=official?.endDate||(input.clearEndDate?null:input.endDate||existing?.endDate||null);
 const eventTime=official||input.clearTime?null:input.eventTime||existing?.eventTime||(!existing&&input.reminderDate===date?input.reminderTime:null);
 const timezone=existing?.timezone||p.timezone;
 if((endDate||date)<today&&!input.eventId)throw new TuckError(400,'That event is in the past. Ask which future date the parent means.');
 if((input.reminderDate===null)!==(input.reminderTime===null))throw new TuckError(400,'Ask the parent when they would like the reminder.');
 if(input.reminderMode==='set'&&(!input.reminderDate||!input.reminderTime))throw new TuckError(400,'Ask when the parent would like to be reminded.');
 let due=input.reminderDate&&input.reminderTime?localInstant(input.reminderDate,input.reminderTime,p.timezone):null;
 let preserveReminder=(input.reminderMode||'keep')==='keep'&&input.reminderDate===null&&input.reminderTime===null;
 if((input.reminderMode||'keep')==='keep'&&input.eventId&&due===null){
   const ids=sourceId?owned.filter(e=>e.sourceId===sourceId).map(e=>e.id):[input.eventId];
   due=await env.DB.prepare(`SELECT due_at FROM parent_reminders WHERE event_id IN (${ids.slice(0,90).map(()=>'?').join(',')}) AND user_id=? AND status='pending' ORDER BY due_at LIMIT 1`).bind(...ids.slice(0,90),userId).first<number>('due_at');
   if(due!==null&&existing&&(existing.date!==date||existing.eventTime!==eventTime)){
     if(existing.date!==date){const wall=localParts(due,p.timezone),delta=Date.parse(date+'T12:00:00Z')-Date.parse(existing.date+'T12:00:00Z');due=localInstant(new Date(Date.parse(wall.date+'T12:00:00Z')+delta).toISOString().slice(0,10),wall.time,p.timezone);}
     preserveReminder=false; // The shifted reminder is shown explicitly in the confirmation.
   }
 }
 if(input.reminderMode==='none')due=null;
 if(due!==null&&!preserveReminder){
   requireReminderDelivery(env);
   if(due<Date.now()+60000||due>Date.now()+366*86400000||localParts(due,p.timezone).date>(endDate||date))throw new TuckError(400,'Choose a future reminder on or before the event ends, within the next year. Ask naturally.');
   if(quietNow(due,p))throw new TuckError(409,`That is inside your quiet hours. Choose a time between ${p.quietEnd}:00 and ${p.quietStart}:00, or adjust quiet hours in My Family.`);
   if(eventTime&&!endDate&&due>localInstant(date,eventTime,timezone))throw new TuckError(400,'That reminder would be after the event starts. Ask what earlier time the parent prefers.');
 }
 return stageDraft(userId,env,{title:official?.title||input.title,date,endDate,eventTime,eventId:input.eventId,childId:input.clearChild?null:input.childId||existing?.childId||null,sourceId,detail:input.detail??existing?.detail??'Entered by you via Parent Assistant; not a verified school announcement.',reminderAt:due,timezone,preserveReminder});
}
export async function prepareAgentCalendarRemoval(userId:string,env:AssistantEnvironment,eventId:string) {
 const event=(await listFamilyEvents(userId,env)).find(e=>e.id===eventId);
 if(!event)throw new TuckError(404,'Event not found.');
 if(event.sourceId)throw new TuckError(400,'Official school dates stay visible. You can cancel the reminder instead.');
 return stageDraft(userId,env,{title:event.title,date:event.date,detail:event.detail,endDate:event.endDate,eventTime:event.eventTime,eventId,childId:event.childId,sourceId:null,reminderAt:null,timezone:event.timezone||'America/New_York',operation:'delete'});
}
