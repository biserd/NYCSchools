import type {CalendarSuggestion} from '../../shared/parent-assistant';
// Reviewed snapshot, not an automatic scrape. Update only after source review.
export const CALENDAR_SOURCE='https://www.schools.nyc.gov/calendar/2026-2027-school-year-calendar';
export const CALENDAR_CHECKED='2026-09-19';
export const CALENDAR_SCOPE='NYCPS district schools (3-K–12) only. Confirm applicability with your school; not a 2-K, NYCEEC, family-childcare, charter or private-school calendar.';
const dates=[
  ['2026-09-21','Yom Kippur: NYCPS closed'],
  ['2026-10-12','Italian Heritage / Indigenous Peoples’ Day: NYCPS closed'],
  ['2026-11-03','Election Day: NYCPS remote instruction, not a holiday'],
  ['2026-11-11','Veterans Day: NYCPS closed'],
  ['2026-11-26','Thanksgiving break begins; through November 27'],
  ['2026-12-24','Winter break begins; through January 1'],
  ['2027-01-18','Martin Luther King Jr. Day: NYCPS closed'],
  ['2027-02-15','Midwinter break begins; through February 19'],
  ['2027-03-09','Eid al-Fitr: NYCPS closed'],
  ['2027-03-26','Good Friday: NYCPS closed'],
  ['2027-04-22','Spring break begins; through April 30'],
  ['2027-05-17','Eid al-Adha: NYCPS closed'],
  ['2027-05-31','Memorial Day: NYCPS closed'],
  ['2027-06-10','NYCPS staff development: students do not attend'],
  ['2027-06-28','NYCPS last student day'],
];
export function calendarSuggestions(today:string):CalendarSuggestion[] {
  return dates.filter(([date])=>date>=today).map(([date,title])=>({id:`nycps-2026-27-${date}`,date,title,sourceUrl:CALENDAR_SOURCE,checkedAt:CALENDAR_CHECKED,applicability:CALENDAR_SCOPE}));
}
