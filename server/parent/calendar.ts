import type {CalendarSuggestion} from '../../shared/parent-assistant';
import {NYCPS_2026_27_EVENTS,NYCPS_CALENDAR_SOURCE,NYCPS_CALENDAR_REVIEWED,NYCPS_CALENDAR_SCOPE} from '../../shared/family-calendar';
export const CALENDAR_SOURCE=NYCPS_CALENDAR_SOURCE;
export const CALENDAR_CHECKED=NYCPS_CALENDAR_REVIEWED;
export const CALENDAR_SCOPE=NYCPS_CALENDAR_SCOPE;
export function calendarSuggestions(today:string):CalendarSuggestion[] {
  return NYCPS_2026_27_EVENTS.filter(event=>event.date>=today).map(event=>({id:event.id,date:event.date,title:event.title,sourceUrl:CALENDAR_SOURCE,checkedAt:CALENDAR_CHECKED,applicability:CALENDAR_SCOPE}));
}
