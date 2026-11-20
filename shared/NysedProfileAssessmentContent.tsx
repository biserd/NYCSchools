import React, { useId,useState } from 'react';
import { NYSED_SMALL_SAMPLE, type AssessmentPoint, type AssessmentSeries, type NysedProfileAssessments } from './nysed-profile-assessments';

const number=new Intl.NumberFormat('en-US');
const percent=(n:number)=>n.toFixed(1)+'%';
const deltaText=(n:number)=> {
  const rounded=Number(n.toFixed(1));
  return (rounded>0?'+':rounded<0?'−':'')+Math.abs(rounded).toFixed(1)+' pp';
};
function unavailable(p:AssessmentPoint) {
  if(p.status==='suppressed') return 'Suppressed';
  if(p.status==='zero_tested') return 'No students tested';
  return 'Not reported';
}
function Result({p}:{p:AssessmentPoint|null}){
  if(!p) return <span className="text-muted-foreground">Not reported</span>;
  return <div>
    <strong className="tabular-nums">{p.percent===null?unavailable(p):percent(p.percent)}</strong>
    {p.proficient!==null && p.tested!==null
      ? <span className="block text-xs text-muted-foreground">{number.format(p.proficient)} of {number.format(p.tested)} proficient</span>
      : p.tested!==null&&p.tested>0&&<span className="block text-xs text-muted-foreground">{number.format(p.tested)} tested</span>}
    {p.smallSample&&<span className="block text-xs font-medium text-amber-800 dark:text-amber-200">Small sample</span>}
  </div>;
}
function Source({p}:{p:AssessmentPoint}) {
  return <span className="text-xs text-muted-foreground"><a href={p.sourceUrl} rel="nofollow noopener noreferrer" target="_blank" className="font-medium text-primary underline">NYSED School Report Card</a> · archive released {p.releasedOn}</span>;
}

function GradeScience({series}:{series:AssessmentSeries}) {
  const {latest,prior,latestAvailable,deltaPp,grade}=series;
  const points=prior||latest.year===2026?[prior,latest] as const:[latest] as const;
  return <div className="rounded-lg border bg-background p-4" data-testid={`nysed-science-grade-${grade}`}>
    <h3 className="font-semibold">Grade {grade} science</h3>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {points.map((p,index)=><div className="rounded-md bg-muted/40 p-3" key={p?.year??'missing-prior'}>
        <p className="text-xs font-medium text-muted-foreground">{index===points.length-1?'Latest archive year':'Prior spring'} · Spring {p?.year??latest.year-1}</p>
        <Result p={p}/>
        {p&&p.percent!==null&&<div className="mt-2 h-1.5 overflow-hidden rounded bg-border" aria-hidden="true"><div className="h-full rounded bg-primary" style={{width:`${p.percent}%`}}/></div>}
      </div>)}
    </div>
    {deltaPp!==null&&<p className="mt-3 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary" data-testid="nysed-yoy">{deltaText(deltaPp)} change in proficiency</p>}
    {latest.percent===null&&latestAvailable&&<p className="mt-3 text-sm">Latest available: <strong>Spring {latestAvailable.year}, {percent(latestAvailable.percent!)}</strong> ({number.format(latestAvailable.tested!)} tested).</p>}
    <p className="mt-2"><Source p={latest}/>{prior&&prior.releasedOn!==latest.releasedOn&&<> · Prior result: <Source p={prior}/></>}</p>
  </div>;
}

function SubjectResult({p}:{p:AssessmentPoint|null}){
  return p?<><span className="block text-xs text-muted-foreground">Spring {p.year}</span><Result p={p}/></>:<Result p={null}/>;
}

function CharterSubjects({data}:{data:NysedProfileAssessments}) {
  const uid=useId();
  const [choice,setChoice]=useState<'ela'|'math'>(data.ela.length?'ela':'math');
  const current=data[choice];
  const source=current[0]?.latest;
  const btn=(subject:'ela'|'math',label:string)=>data[subject].length>0&&<button type="button"
    aria-pressed={choice===subject} aria-controls={uid+'-results'} onClick={()=>setChoice(subject)}
    className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary">
    {label}
  </button>;
  return <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby={uid+'-heading'} data-testid="nysed-charter-assessments">
    <h2 id={uid+'-heading'} className="text-xl font-semibold">Charter school test results</h2>
    <p className="text-sm text-muted-foreground">NYSED School Report Card · All Students · Grades 3–8. These supplemental results do not change site ratings.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Assessment subject">
      {btn('ela','ELA')}{btn('math','Math')}
    </div>
    <div id={uid+'-results'} className="space-y-3">
      <h3 className="font-semibold">{choice==='ela'?'English language arts':'Grade-level math'}</h3>
      {choice==='math'&&<p className="text-sm text-muted-foreground">Regular grade-level math only. Regents-in-lieu and combined rows are separate and are not included. No schoolwide math average or change is inferred.</p>}
      <div className="overflow-x-auto" role="region" aria-label="Charter assessment results by grade" tabIndex={0}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{choice==='ela'?'ELA':'Regular math'} proficiency, tested counts and spring years</caption>
          <thead className="bg-muted/50 text-sm"><tr>{['Grade','Latest archive result','Prior spring','Change'].map(title=><th scope="col" className="p-2.5" key={title}>{title}</th>)}</tr></thead>
          <tbody>
            {current.map(s=><tr className="border-b align-top text-sm" key={s.assessment} data-testid={`nysed-${s.assessment}`}>
              <th scope="row" className="p-2.5">{s.grade===0?'Published grades 3–8 total':`Grade ${s.grade}`}</th>
              <td className="p-2.5"><SubjectResult p={s.latest}/>
                {s.latest.percent===null&&s.latestAvailable&&s.latestAvailable.year!==s.prior?.year&&<p className="mt-1 text-xs text-muted-foreground">Latest available: spring {s.latestAvailable.year} · {percent(s.latestAvailable.percent!)}</p>}
              </td>
              <td className="p-2.5"><SubjectResult p={s.prior}/></td>
              <td className="p-2.5 tabular-nums">{s.deltaPp!==null?deltaText(s.deltaPp):<span className="text-muted-foreground" aria-label="No comparable change">—</span>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {source&&<p><Source p={source}/></p>}
    </div>
    <p className="text-xs text-muted-foreground">Small sample means fewer than {NYSED_SMALL_SAMPLE} students tested. Changes in percentage points compare reported proficiency, not individual student growth.</p>
  </section>;
}

export function NysedProfileAssessmentContent({data}:{data:NysedProfileAssessments}) {
  if(!data.science.length&&!data.ela.length&&!data.math.length) return null;
  return <div className="space-y-4" data-testid="nysed-profile-assessments">
    {data.science.length>0&&<section className="space-y-3 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="nysed-science-title">
      <h2 className="text-xl font-semibold" id="nysed-science-title">Science test results by grade</h2>
      <p className="text-sm text-muted-foreground">All Students. Grade 5 and grade 8 are shown separately. Grade 8 is the regular state assessment, not Regents-in-lieu or a combined rate.</p>
      <div className="grid gap-3 xl:grid-cols-2">{data.science.map(series=><GradeScience series={series} key={series.assessment}/>)}</div>
      <p className="text-xs text-muted-foreground">Bars use a 0–100% scale. Small sample means under {NYSED_SMALL_SAMPLE} students tested. A proficiency change compares different groups of students; it does not measure individual student growth.</p>
    </section>}
    {(data.ela.length>0||data.math.length>0)&&<CharterSubjects data={data}/>}
  </div>;
}
