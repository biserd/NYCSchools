import { z } from 'zod';

export const parentPreferencesInput = z.object({
  timezone: z.string().max(80).refine(value => { try { new Intl.DateTimeFormat('en', {timeZone:value}); return true; } catch { return false; } }, 'Choose a valid timezone'),
  quietStart: z.number().int().min(0).max(23), quietEnd: z.number().int().min(0).max(23),
  // Accepted for backward compatibility with clients released before paid
  // access enabled the assistant by default. These are no longer activation
  // switches; each submitted AI request and each scheduled reminder is explicit.
  reminderConsent: z.boolean().optional(), aiConsent: z.boolean().optional(),
}).strict().refine(p => p.quietStart !== p.quietEnd, 'Quiet hours must leave a delivery window');
export const reminderInput = z.object({eventId:z.string().uuid(), localDate:z.string().regex(/^20\d{2}-\d{2}-\d{2}$/), localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict();
export const parentMessageInput = z.object({message:z.string().trim().min(1).max(1500)}).strict();
export const PARENT_LIMITS = { questionsPerDay: 30, remindersPerMonth: 100, pendingReminders: 100 } as const;

export interface ParentPreferences { timezone:string; quietStart:number; quietEnd:number; reminderConsent:boolean; aiConsent:boolean }
export interface ParentReminder { id:string; event_id:string; due_at:number; status:string; title:string; timezone:string }
export interface CalendarSuggestion { id:string; date:string; title:string; sourceUrl:string; checkedAt:string; applicability:string }
