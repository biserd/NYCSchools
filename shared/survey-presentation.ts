import type { SurveyResult } from './surveys';
export function scoreBand(value:number|null) {
  if(value===null)return {label:'Not reported',text:'text-slate-600 dark:text-slate-300',background:'bg-slate-100 dark:bg-slate-900',bar:'bg-slate-400'};
  if(value>=90)return {label:'90–100 · Higher end',text:'text-teal-800 dark:text-teal-200',background:'bg-teal-50 dark:bg-teal-950/40',bar:'bg-teal-600'};
  if(value>=70)return {label:'70–89 · Middle band',text:'text-blue-800 dark:text-blue-200',background:'bg-blue-50 dark:bg-blue-950/40',bar:'bg-blue-600'};
  return {label:'0–69 · Lower end',text:'text-amber-900 dark:text-amber-200',background:'bg-amber-50 dark:bg-amber-950/40',bar:'bg-amber-600'};
}
export function surveyNarrative(result:SurveyResult) {
  const reported=result.metrics.filter(m=>m.value!==null).sort((a,b)=>b.value!-a.value!);
  if(!reported.length)return {title:'The record is here; the scores are not published',text:'This source record has no published topic scores. That is a limit of the available feedback—not a negative judgment about this provider. Ask directly about staff support, communication and the daily experience.'};
  const top=reported[0],last=reported[reported.length-1];
  if(top.value===last.value)return {title:'Published topics are at the same level',text:`All ${reported.length} reported topics score ${top.value}/100. Check participation before treating that consistency as a complete picture. Ask what respondents value and whose experience may be missing.`};
  return {title:'A starting point for your school visit',text:`${top.label} is among the highest published topics (${top.value}/100). ${last.label} sits lower (${last.value}/100). These topics ask different questions: use the pattern to guide a conversation, not to infer a cause or an overall school grade.`};
}
