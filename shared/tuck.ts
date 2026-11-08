import { z } from "zod";

export const tuckChildInput = z.object({
  nickname: z.string().trim().min(1).max(50),
  schoolDbn: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z][0-9]{3}$/).nullable().default(null),
}).strict();
export const familyDate = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid date');
export const familyTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const tuckEventInput = z.object({
  childId: z.string().uuid().nullable().default(null),
  title: z.string().trim().min(1).max(160),
  date: familyDate,
  endDate: familyDate.nullable().default(null),
  eventTime: familyTime.nullable().default(null),
  timezone: z.string().max(80).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'Choose a valid timezone').default('America/New_York'),
  sourceId: z.string().regex(/^nycps-2026-27-20\d{2}-\d{2}-\d{2}$/).nullable().default(null),
  detail: z.string().trim().max(1000).default(""),
}).strict();
export const familyEventInput = tuckEventInput.extend({
  requestId:z.string().uuid().optional(),
  reminder:z.object({localDate:familyDate,localTime:familyTime}).strict().nullable().optional(),
}).refine(value=>!value.endDate||value.endDate>=value.date,{message:'End date must be on or after the start date',path:['endDate']});

export type FamilyEvent = {id:string;childId:string|null;title:string;date:string;detail:string;endDate?:string|null;eventTime?:string|null;timezone?:string;sourceId?:string|null};
export type FamilyChild = {id:string;nickname:string;schoolDbn:string|null;schoolName:string|null;schoolUrl:string|null;gradeBand?:string|null;district?:number|null;calendarScope?:'nycps'|'other'|'unknown'};

export interface TuckOverview {
  household: { id: string } | null;
  children: FamilyChild[];
  events: FamilyEvent[];
  capabilities: { calendar: true; whatsapp: boolean; automaticReminders: boolean };
}
