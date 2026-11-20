import React,{useId,useState} from 'react';
import { REGISTER_SOURCE,type RegisterCell } from './classroomPilot';
import { enrollmentChange,enrollmentGradeName,enrollmentPeriods,hasRegisterValue,type EnrollmentPair,type SchoolEnrollment } from './school-enrollment';

const number=new Intl.NumberFormat('en-US');
const count=(c:RegisterCell)=>c.count===null?(c.status==='suppressed'?'Suppressed':'Not reported'):number.format(c.count);
const {previous,current}=enrollmentPeriods;
const label=(grade:string)=>grade==='Total K-12'?'K–12 enrollment':grade==='Total'?'Enrollment including early grades':enrollmentGradeName(grade);
const reportedPair=(p:EnrollmentPair)=>p.previous.count!==null&&p.current.count!==null;
const sameCells=(a:EnrollmentPair,b:EnrollmentPair)=>reportedPair(a)&&reportedPair(b)&&
  a.previous.count===b.previous.count&&a.current.count===b.current.count;

function ChangeBadge({pair}:{pair:EnrollmentPair}){
  const change=enrollmentChange(pair);
  if(change===null)return null;
  const phrasing=change===0?'No change':`${change>0?'Up':'Down'} ${number.format(Math.abs(change))} ${Math.abs(change)===1?'student':'students'}`;
  return <span className={'inline-block rounded-full px-2 py-0.5 text-xs font-semibold '+(change<0?'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200':change>0?'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200':'bg-muted text-foreground')}>{phrasing}</span>;
}

function TotalCard({pair}:{pair:EnrollmentPair}){
  return <div className="min-w-0 rounded-lg border bg-card p-3" data-testid="enrollment-total">
    <p className="text-sm font-medium">{label(pair.grade)}</p>
    <div className="my-2 grid grid-cols-2 gap-3">
      {([[previous,pair.previous],[current,pair.current]] as const).map(([p,c])=><div key={p.id}>
        <p className="text-xs text-muted-foreground">{p.year} {p.status}</p>
        <p className="text-lg font-semibold tabular-nums">{count(c)}</p>
      </div>)}
    </div>
    <ChangeBadge pair={pair}/>
  </div>;
}

function GradeView({data}:{data:SchoolEnrollment}){
  const id=useId();
  const [grade,setGrade]=useState(()=>data.grades.find(p=>p.grade==='K')?.grade??data.grades[0]?.grade??'');
  const selected=data.grades.find(p=>p.grade===grade)??data.grades[0];
  if(!selected)return null;
  const max=Math.max(1,selected.previous.count??0,selected.current.count??0);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold">Grade to compare</label>
      <select id={id} value={selected.grade} onChange={e=>setGrade(e.currentTarget.value)} className="max-w-full rounded-md border bg-background px-3 py-2 text-sm">
        {data.grades.map(p=><option value={p.grade} key={p.grade}>{enrollmentGradeName(p.grade)}</option>)}
      </select>
    </div>
    <figure className="space-y-3 rounded-lg border bg-card p-3" data-testid="enrollment-grade-chart" aria-live="polite">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{enrollmentGradeName(selected.grade)} enrollment</span><ChangeBadge pair={selected}/>
      </figcaption>
      {([[previous,selected.previous,'bg-primary/60'],[current,selected.current,'bg-primary']] as const).map(([p,c,color])=><div key={p.id}>
        <div className="flex flex-wrap justify-between gap-x-2 text-sm"><span>{p.year} · {p.status}</span><strong className="tabular-nums">{count(c)}</strong></div>
        {c.count!==null&&<div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className={`h-full rounded-full ${color}`} style={{width:`${100*c.count/max}%`}}/></div>}
      </div>)}
      <p className="text-xs text-muted-foreground">Bars start at zero and share a scale for this grade.</p>
    </figure>
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">See enrollment for all reported grades</summary>
      <div className="mt-2 overflow-x-auto" role="region" aria-label="Enrollment counts by grade" tabIndex={0}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">NYCPS register counts by grade for both periods</caption>
          <thead className="bg-muted/60"><tr>{['Grade',previous.year+' audited',current.year+' preliminary'].map(h=><th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
          <tbody>{data.grades.map(p=><tr key={p.grade} className="border-b"><th scope="row" className="p-2 font-medium">{label(p.grade)}</th>
            <td className="p-2 tabular-nums">{count(p.previous)}</td><td className="p-2 tabular-nums">{count(p.current)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

export function SchoolEnrollmentVisual({data,embedded=false}:{data:SchoolEnrollment;embedded?:boolean}){
  const id=useId();
  const Head=embedded?'h3':'h2';
  const totals=data.totals.length===2&&sameCells(data.totals[0],data.totals[1])?data.totals.slice(0,1):data.totals;
  const periods=[...data.totals,...data.grades];
  return <section id="enrollment-by-grade" aria-labelledby={id} data-testid="school-enrollment-visual"
    className={embedded?'min-w-0 scroll-mt-20 space-y-3':'min-w-0 scroll-mt-20 space-y-3 rounded-xl border bg-card p-4 sm:p-6'}>
    <div>
      <Head id={id} className="text-xl font-semibold">Enrollment by grade</Head>
      <p className="text-sm text-muted-foreground">{previous.year} {previous.label.toLowerCase()} compared with the {current.label} register.</p>
      {!periods.some(p=>hasRegisterValue(p.current))&&<p className="mt-1 text-sm">No preliminary count was reported for this school.</p>}
      {!periods.some(p=>hasRegisterValue(p.previous))&&<p className="mt-1 text-sm">No audited count was reported for this school.</p>}
    </div>
    <div className={`grid gap-2 ${totals.length>1?'sm:grid-cols-2':''}`}>{totals.map(p=><TotalCard key={p.grade} pair={p}/>)}</div>
    <GradeView data={data}/>
    <p className="text-xs text-muted-foreground">Enrollment counts students on the school register. It is not a count of students in a classroom or an estimate of open seats. Preliminary counts can change. Forecasts are not shown.</p>
    <p className="text-sm"><a href={REGISTER_SOURCE} target="_blank" rel="nofollow noopener noreferrer" className="font-medium text-primary underline">NYCPS Table B enrollment registers</a></p>
  </section>;
}
