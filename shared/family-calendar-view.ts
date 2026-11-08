import {NYCPS_2026_27_EVENTS,NYCPS_CALENDAR_SOURCE,type PublicFamilyEvent} from './family-calendar';
import type {FamilyChild,FamilyEvent} from './tuck';

export type CalendarEntry = {id:string;eventId?:string;eventIds?:string[];sourceId?:string;date:string;endDate?:string;eventTime?:string|null;timezone?:string;title:string;detail?:string;kind:'closure'|'schedule'|'milestone'|'academic'|'family';source:'nycps'|'family';childId?:string|null};
export function schoolCalendarScope(school:{dbn:string;district:number;gradeBand:string}):'nycps'|'other'|'unknown' {
  if(school.district===84||!/^\d{2}[MKQRX]\d{3}$/.test(school.dbn)||/^(2K|3K|PK|PRE-?K)$/i.test(school.gradeBand))return 'other';
  return (school.district>=1&&school.district<=32)||[75,79].includes(school.district)?'nycps':'unknown';
}
export function officialSourceId(event:Pick<FamilyEvent,'sourceId'|'title'|'date'|'detail'>):string|null {
  if(event.sourceId&&NYCPS_2026_27_EVENTS.some(e=>e.id===event.sourceId))return event.sourceId;
  // Recognize only explicitly attributed legacy imports; a parent-created name match is not identity proof.
  if(!event.detail.startsWith(`Source: ${NYCPS_CALENDAR_SOURCE}`))return null;
  return NYCPS_2026_27_EVENTS.find(e=>e.date===event.date&&(e.title===event.title||['2026-11-20','2027-03-19'].includes(e.date)&&event.title==='High school / 6–12 conferences'))?.id||null;
}
type Audience='elementary'|'middle'|'high'|'k12'|'six12'|'d75';
const audiences:Record<string,Audience[]>={
 '2026-09-23':['middle','d75'],'2026-09-24':['high','k12','six12'],'2026-09-30':['elementary'],
 '2026-11-05':['elementary'],'2026-11-12':['middle','d75'],'2026-11-19':['high','k12','six12'],'2026-11-20':['high','k12','six12'],
 '2027-01-26':['high','k12','six12'],'2027-02-01':['high','six12'],'2027-02-02':['high','k12','six12'],
 '2027-03-03':['elementary'],'2027-03-04':['middle','d75'],'2027-03-18':['high','k12','six12'],'2027-03-19':['high','k12','six12'],
 '2027-05-12':['high','k12','six12'],'2027-05-13':['middle','d75'],'2027-05-26':['elementary'],
 '2027-06-08':['elementary','middle','k12','d75'],'2027-06-15':['high','k12','six12'],'2027-06-21':['high','k12','six12'],
};
export function appliesToChild(event:PublicFamilyEvent,child:Pick<FamilyChild,'calendarScope'|'gradeBand'|'district'>):boolean {
  if(child.calendarScope==='other')return false;
  if(!child.gradeBand||child.calendarScope!=='nycps')return true; // Unknown stays visible with scope caveat.
  const band=child.gradeBand.toUpperCase().replaceAll('–','-');
  const audience:Audience=child.district===75?'d75':/^(K|PK|PREK|PRE-K|3K|3-K)-12$/.test(band)?'k12':/^6-12$/.test(band)?'six12':/9|10|11|12/.test(band)?'high':/^6-8$/.test(band)?'middle':'elementary';
  return !audiences[event.date]||audiences[event.date].includes(audience);
}
export function mergeFamilyCalendar(privateEvents:FamilyEvent[],children:FamilyChild[]=[],childId='all',includeOfficial=true):CalendarEntry[] {
  const selected=children.filter(c=>childId==='all'||c.id===childId);
  const official=includeOfficial?NYCPS_2026_27_EVENTS.filter(e=>!selected.length||selected.some(c=>appliesToChild(e,c))):[];
  const visible=privateEvents.filter(e=>childId==='all'||e.childId===null||e.childId===childId);
  const grouped=new Map<string,FamilyEvent[]>();
  for(const e of visible){const sourceId=officialSourceId(e);if(sourceId)grouped.set(sourceId,[...(grouped.get(sourceId)||[]),e]);}
  const entries:CalendarEntry[]=official.map(e=>({id:e.id,sourceId:e.id,eventId:grouped.get(e.id)?.[0]?.id,eventIds:grouped.get(e.id)?.map(e=>e.id),date:e.date,endDate:e.endDate,title:e.title,detail:e.note,kind:e.kind,source:'nycps'}));
  for(const e of visible){
    const sourceId=officialSourceId(e);
    if(sourceId){
      // A followed official date remains visible under "Your family"/reference-off without duplicates.
      if(!entries.some(entry=>entry.id===sourceId)){const source=NYCPS_2026_27_EVENTS.find(item=>item.id===sourceId)!;if(childId!=='all'&&selected.length&&!selected.some(c=>appliesToChild(source,c)))continue;entries.push({id:sourceId,sourceId,eventId:e.id,eventIds:grouped.get(sourceId)?.map(item=>item.id),date:source.date,endDate:source.endDate,title:source.title,detail:source.note,kind:source.kind,source:'nycps'});}
    }else entries.push({id:e.id,eventId:e.id,date:e.date,endDate:e.endDate||undefined,eventTime:e.eventTime,timezone:e.timezone,title:e.title,detail:e.detail,kind:'family',source:'family',childId:e.childId});
  }
  return entries.sort((a,b)=>a.date.localeCompare(b.date)||(a.eventTime||'').localeCompare(b.eventTime||''));
}
