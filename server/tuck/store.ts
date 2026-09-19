import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { schools, tuckChildren, tuckEvents, tuckHouseholds } from "@shared/schema";
import { tuckChildInput, tuckEventInput, type TuckOverview } from "@shared/tuck";
import { getSchoolSlug } from "@shared/schema";

export class TuckError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function householdFor(userId: string) {
  const [household] = await db.select().from(tuckHouseholds).where(eq(tuckHouseholds.ownerUserId, userId)).limit(1);
  return household;
}
async function requireHousehold(userId: string) {
  const household = await householdFor(userId);
  if (!household) throw new TuckError(409, "Create your family space first.");
  return household;
}
export async function createHousehold(userId: string) {
  await db.insert(tuckHouseholds).values({ id: crypto.randomUUID(), ownerUserId: userId }).onConflictDoNothing({ target: tuckHouseholds.ownerUserId });
  return requireHousehold(userId);
}
export async function getOverview(userId: string): Promise<TuckOverview> {
  const household = await householdFor(userId);
  const capabilities = { calendar: true, whatsapp: false, automaticReminders: false } as const;
  if (!household) return { household: null, children: [], events: [], capabilities };
  const children = await db.select({ id: tuckChildren.id, nickname: tuckChildren.nickname, schoolDbn: tuckChildren.schoolDbn, schoolName: schools.name })
    .from(tuckChildren).leftJoin(schools, eq(tuckChildren.schoolDbn, schools.dbn))
    .where(eq(tuckChildren.householdId, household.id)).orderBy(asc(tuckChildren.nickname));
  const events = await db.select({ id: tuckEvents.id, childId: tuckEvents.childId, title: tuckEvents.title, date: tuckEvents.date, detail: tuckEvents.detail })
    .from(tuckEvents).where(eq(tuckEvents.householdId, household.id)).orderBy(asc(tuckEvents.date), asc(tuckEvents.createdAt));
  return { household: { id: household.id }, children: children.map(child => ({ ...child,
    schoolUrl: child.schoolDbn && child.schoolName ? `/school/${getSchoolSlug({ dbn: child.schoolDbn, name: child.schoolName })}` : null,
  })), events, capabilities };
}
export async function addChild(userId: string, input: unknown) {
  const data = tuckChildInput.parse(input);
  const household = await requireHousehold(userId);
  if (data.schoolDbn) {
    const [school] = await db.select({ dbn: schools.dbn }).from(schools).where(eq(schools.dbn, data.schoolDbn)).limit(1);
    if (!school) throw new TuckError(400, "School identifier not found. Leave it blank or use a canonical school DBN.");
  }
  const [child] = await db.insert(tuckChildren).values({ ...data, id: crypto.randomUUID(), householdId: household.id }).returning();
  return child;
}
export async function addEvent(userId: string, input: unknown) {
  const data = tuckEventInput.parse(input);
  const household = await requireHousehold(userId);
  if (data.childId) {
    const [child] = await db.select({ id: tuckChildren.id }).from(tuckChildren)
      .where(and(eq(tuckChildren.id, data.childId), eq(tuckChildren.householdId, household.id))).limit(1);
    if (!child) throw new TuckError(404, "Child not found.");
  }
  const [event] = await db.insert(tuckEvents).values({ ...data, id: crypto.randomUUID(), householdId: household.id }).returning();
  return event;
}
export async function removeEvent(userId: string, id: string) {
  const household = await requireHousehold(userId);
  const deleted = await db.delete(tuckEvents).where(and(eq(tuckEvents.id, id), eq(tuckEvents.householdId, household.id))).returning({ id: tuckEvents.id });
  if (!deleted.length) throw new TuckError(404, "Event not found.");
}
export async function removeChild(userId: string, id: string) {
  const household = await requireHousehold(userId);
  const deleted = await db.delete(tuckChildren).where(and(eq(tuckChildren.id, id), eq(tuckChildren.householdId, household.id))).returning({ id: tuckChildren.id });
  if (!deleted.length) throw new TuckError(404, "Child not found.");
}
