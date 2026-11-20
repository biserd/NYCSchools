export const NYSED_SMALL_SAMPLE = 20;
export type AssessmentSubject = 'science'|'ela'|'math';
export type AssessmentStatus = 'count'|'published_percent'|'suppressed'|'zero_tested'|'missing';
export type AssessmentRow = {
  subject:AssessmentSubject; assessment:string; grade:number; year:number;
  definition:string; institutionId:string; bedsCode:string; sourceUrl:string;
  releaseId:string; releasedOn:string; tested:number|null; proficient:number|null;
  publishedPercent:number|null; status:AssessmentStatus;
};
export type AssessmentPoint = {
  year:number; tested:number|null; proficient:number|null; percent:number|null;
  status:AssessmentStatus; smallSample:boolean; sourceUrl:string; releasedOn:string;
};
export type AssessmentSeries = {
  subject:AssessmentSubject; grade:number; assessment:string;
  latest:AssessmentPoint; prior:AssessmentPoint|null; latestAvailable:AssessmentPoint|null; deltaPp:number|null;
};
export type NysedProfileAssessments = { science:AssessmentSeries[]; ela:AssessmentSeries[]; math:AssessmentSeries[] };

function usableCount(row:AssessmentRow) {
  return row.status==='count' && row.tested!==null && row.tested>0 &&
    row.proficient!==null && row.proficient>=0 && row.proficient<=row.tested;
}

function point(row:AssessmentRow):AssessmentPoint {
  const exact=usableCount(row);
  const percent=exact ? 100*row.proficient!/row.tested! : row.status==='published_percent' && (row.tested??0)>0
    && row.publishedPercent!==null && row.publishedPercent>=0 && row.publishedPercent<=100 ? row.publishedPercent : null;
  return {year:row.year,tested:row.tested,proficient:exact?row.proficient:null,percent,status:row.status,
    smallSample:row.tested!==null&&row.tested>0&&row.tested<NYSED_SMALL_SAMPLE,sourceUrl:row.sourceUrl,releasedOn:row.releasedOn};
}

export function buildNysedProfileAssessments(rows:readonly AssessmentRow[]):NysedProfileAssessments {
  const response:NysedProfileAssessments={science:[],ela:[],math:[]};
  const byAssessment=new Map<string,AssessmentRow[]>();
  for (const row of rows) {
    const expected=row.subject==='science'&&[5,8].includes(row.grade)?`Science${row.grade}`:
      row.subject==='ela'&&row.grade===0?'ELA3_8':
      row.subject!=='science'&&row.grade>=3&&row.grade<=8?`${row.subject==='ela'?'ELA':'MATH'}${row.grade}`:null;
    if(row.assessment!==expected) continue;
    const group=byAssessment.get(row.assessment)??[];
    group.push(row); byAssessment.set(row.assessment,group);
  }
  for (const group of byAssessment.values()) {
    group.sort((a,b)=>b.year-a.year||b.releasedOn.localeCompare(a.releasedOn)||b.releaseId.localeCompare(a.releaseId));
    const latest=group[0], previous=group.find(row=>row.year===latest.year-1);
    const latestAvailable=group.find(row=>point(row).percent!==null);
    const p=point(latest);
    const prior=previous?point(previous):null;
    // Require an exact paired cohort definition from the same archived release.
    // No estimates, rounded-only rows, Regents substitutes, or moved schools.
    const publishedElaGrades=(row:AssessmentRow)=>[...new Set(rows.filter(candidate=>
      candidate.subject==='ela' && candidate.grade>=3 && candidate.grade<=8 && candidate.assessment===`ELA${candidate.grade}` &&
      candidate.year===row.year && candidate.releaseId===row.releaseId && candidate.institutionId===row.institutionId &&
      candidate.bedsCode===row.bedsCode).map(candidate=>candidate.grade))].sort().join(',');
    const gradesComparable=latest.grade!==0 || (previous && publishedElaGrades(latest)!=='' && publishedElaGrades(latest)===publishedElaGrades(previous));
    const comparable=gradesComparable&&previous&&usableCount(latest)&&usableCount(previous)&&
      latest.releaseId===previous.releaseId&&latest.definition===previous.definition&&
      latest.institutionId===previous.institutionId&&latest.bedsCode===previous.bedsCode;
    if (!latestAvailable && !group.some(row=>row.status==='suppressed')) continue;
    response[latest.subject].push({subject:latest.subject,grade:latest.grade,assessment:latest.assessment,
      latest:p,prior,latestAvailable:latestAvailable?point(latestAvailable):null,
      deltaPp:comparable ? 100*(latest.proficient!*previous.tested!-previous.proficient!*latest.tested!)/(latest.tested!*previous.tested!) : null});
  }
  for(const series of Object.values(response)) series.sort((a,b)=>a.grade-b.grade);
  return response;
}
