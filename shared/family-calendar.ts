// Reviewed against the NYCPS 2026–27 calendar. These dates apply to NYCPS
// district schools (3-K–12), not every school in our directory.
export const NYCPS_CALENDAR_SOURCE = 'https://www.schools.nyc.gov/calendar/2026-2027-school-year-calendar';
export const NYCPS_CALENDAR_REVIEWED = '2026-09-24';
export const NYCPS_CALENDAR_SCOPE = 'NYCPS district schools (3-K–12). Private, charter, NYCEEC, family-childcare and 2-K providers may use different calendars. Confirm school-specific dates with your school.';

export type FamilyCalendarKind = 'closure' | 'schedule' | 'milestone' | 'academic';
export type PublicFamilyEvent = { id: string; date: string; endDate?: string; title: string; kind: FamilyCalendarKind; note?: string };
const event = (date: string, title: string, kind: FamilyCalendarKind, endDate?: string, note?: string): PublicFamilyEvent => ({ id: `nycps-2026-27-${date}`, date, title, kind, endDate, note });

export const NYCPS_2026_27_EVENTS: PublicFamilyEvent[] = [
  event('2026-09-10', 'First day of school', 'milestone'),
  event('2026-09-21', 'Yom Kippur — schools closed', 'closure'),
  event('2026-09-23', 'Middle school and D75 evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2026-09-24', 'High school, K–12 and 6–12 evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2026-09-30', 'Elementary and Pre-K Center evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2026-10-12', 'Italian Heritage / Indigenous Peoples’ Day — schools closed', 'closure'),
  event('2026-11-03', 'Election Day — remote instruction', 'schedule', undefined, 'School is in session remotely; this is not a day off.'),
  event('2026-11-05', 'Elementary and Pre-K conferences', 'schedule', undefined, 'Afternoon and evening conferences; affected students dismissed three hours early.'),
  event('2026-11-11', 'Veterans Day — schools closed', 'closure'),
  event('2026-11-12', 'Middle school and D75 conferences', 'schedule', undefined, 'Afternoon and evening conferences; affected students dismissed three hours early.'),
  event('2026-11-19', 'High school, K–12 and 6–12 evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2026-11-20', 'High school / 6–12 conferences', 'schedule', undefined, 'Afternoon conferences; affected students dismissed three hours early.'),
  event('2026-11-26', 'Thanksgiving recess', 'closure', '2026-11-27'),
  event('2026-12-24', 'Winter recess', 'closure', '2027-01-01'),
  event('2027-01-18', 'Martin Luther King Jr. Day — schools closed', 'closure'),
  event('2027-01-26', 'Regents administration', 'academic', '2027-01-29', 'High-school exam administration; check the schedule with your school.'),
  event('2027-02-01', 'Professional development day', 'schedule', undefined, 'Students at high schools and standalone 6–12 schools do not attend; other students attend.'),
  event('2027-02-02', 'Spring semester begins', 'milestone'),
  event('2027-02-15', 'Midwinter recess', 'closure', '2027-02-19'),
  event('2027-03-03', 'Elementary and Pre-K conferences', 'schedule', undefined, 'Afternoon and evening conferences; affected students dismissed three hours early.'),
  event('2027-03-04', 'Middle school and D75 conferences', 'schedule', undefined, 'Afternoon and evening conferences; affected students dismissed three hours early.'),
  event('2027-03-09', 'Eid al-Fitr — schools closed', 'closure'),
  event('2027-03-18', 'High school, K–12 and 6–12 evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2027-03-19', 'High school / 6–12 conferences', 'schedule', undefined, 'Afternoon conferences; affected students dismissed three hours early.'),
  event('2027-03-26', 'Good Friday — schools closed', 'closure'),
  event('2027-04-22', 'Spring recess', 'closure', '2027-04-30'),
  event('2027-05-12', 'High school, K–12 and 6–12 evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2027-05-13', 'Middle school and D75 evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2027-05-17', 'Eid al-Adha — schools closed', 'closure'),
  event('2027-05-26', 'Elementary and Pre-K Center evening conferences', 'schedule', undefined, 'Parent-teacher conferences; your school may schedule a different date.'),
  event('2027-05-31', 'Memorial Day — schools closed', 'closure'),
  event('2027-06-08', 'Clerical day', 'schedule', undefined, 'No classes for 3-K, Pre-K, elementary, middle, K–12 and standalone D75 students.'),
  event('2027-06-10', 'Staff development day — students do not attend', 'closure'),
  event('2027-06-15', 'Regents administration', 'academic', '2027-06-18', 'High-school exam administration; check the schedule with your school.'),
  event('2027-06-21', 'Regents administration', 'academic', '2027-06-25', 'High-school exam administration; check the schedule with your school.'),
  event('2027-06-28', 'Last day of school for students', 'milestone'),
];
