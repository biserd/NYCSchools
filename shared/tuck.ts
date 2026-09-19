import { z } from "zod";

export const tuckChildInput = z.object({
  nickname: z.string().trim().min(1).max(50),
  schoolDbn: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z][0-9]{3}$/).nullable().default(null),
}).strict();
export const tuckEventInput = z.object({
  childId: z.string().uuid().nullable().default(null),
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date"),
  detail: z.string().trim().max(1000).default(""),
}).strict();

export interface TuckOverview {
  household: { id: string } | null;
  children: { id: string; nickname: string; schoolDbn: string | null; schoolName: string | null; schoolUrl: string | null }[];
  events: { id: string; childId: string | null; title: string; date: string; detail: string }[];
  capabilities: { calendar: true; whatsapp: false; automaticReminders: false };
}
