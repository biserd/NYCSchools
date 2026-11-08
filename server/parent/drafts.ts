import {z} from 'zod';
import {familyDate,familyTime} from '../../shared/tuck';
import type {PendingFamilyDraft} from '../../shared/parent-assistant';
export const familyDraftSchema=z.object({
 title:z.string().trim().min(1).max(160),date:familyDate,detail:z.string().max(1000),reminderAt:z.number().nullable(),timezone:z.string(),
 endDate:familyDate.nullable().default(null),eventTime:familyTime.nullable().default(null),sourceId:z.string().nullable().default(null),
 childId:z.string().uuid().nullable().default(null),eventId:z.string().uuid().nullable().default(null),operation:z.enum(['save','delete']).default('save'),preserveReminder:z.boolean().default(false),
}).strict();
export type FamilyDraftInput=z.input<typeof familyDraftSchema>;
export function draftSummary(d:FamilyDraftInput) {
 const date=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',dateStyle:'medium'}).format(new Date(value+'T12:00:00Z'));
 const time=d.eventTime?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date('2000-01-01T'+d.eventTime+':00Z')):null;
 return `${d.operation==='delete'?'Remove: ':''}${d.title} · ${date(d.date)}${d.endDate?` to ${date(d.endDate)}`:''}${time?` at ${time}`:''}${d.operation==='delete'?'\nThis also cancels the event’s reminders.':d.preserveReminder?'\nExisting reminders stay unchanged.':d.reminderAt?`\nWhatsApp reminder: ${new Intl.DateTimeFormat('en-US',{timeZone:d.timezone,dateStyle:'medium',timeStyle:'short'}).format(d.reminderAt)} (${d.timezone})`:'\nCalendar only, no reminder'}`;
}
export async function pendingFamilyDrafts(db:D1Database,userId:string,now=Date.now()):Promise<PendingFamilyDraft[]> {
 const rows=await db.prepare('SELECT id,payload,expires_at FROM parent_drafts WHERE user_id=? AND confirmed_at IS NULL AND expires_at>? ORDER BY expires_at DESC LIMIT 5').bind(userId,now).all<{id:string;payload:string;expires_at:number}>();
 return rows.results.flatMap(row=>{try{const draft=familyDraftSchema.parse(JSON.parse(row.payload));return [{draftId:row.id,expiresAt:row.expires_at,summary:draftSummary(draft),title:draft.title,date:draft.date,endDate:draft.endDate,eventTime:draft.eventTime,reminderAt:draft.reminderAt,timezone:draft.timezone,sourceId:draft.sourceId,operation:draft.operation,preserveReminder:draft.preserveReminder}];}catch{return [];}});
}
