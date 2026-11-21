import React from 'react';
import { CITY_CAP_SOURCE,CITY_CLASS_SOURCE,classSizeDate,classSizeGrade } from './city-class-size';
import { PILOT_DISTRICT_PATH,REGISTER_SOURCE } from './classroomPilot';
import { classroomTakeawayHeadline, type ClassroomTakeaway } from './classroom-family';

const n=new Intl.NumberFormat('en-US');
const sourceProps={target:'_blank',rel:'nofollow noopener noreferrer',className:'text-primary underline'};

export function ClassroomFamilyTakeaway({data}:{data:ClassroomTakeaway}){
  const {grade,observedOn,enrollment,range,cap,distribution,benchmark}=data;
  const label=classSizeGrade(grade);
  const gradeLabel=grade==='K'?'kindergarten':label;
  const hasExact=distribution.length>0;
  const min=distribution[0]?.size,max=distribution.at(-1)?.size;
  return <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5" data-testid="classroom-parent-outcome">
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">What this means for your family</p>
      <h3 className="mt-1 text-xl font-bold">{classroomTakeawayHeadline(data)}</h3>
      {enrollment&&<p className="mt-2 text-sm">From the 2025–26 audited register to the October 2026 preliminary count, K–12 enrollment went from <strong>{n.format(enrollment.total.previous.count!)} to {n.format(enrollment.total.current.count!)}</strong>, while {gradeLabel} went from <strong>{n.format(enrollment.grade.previous.count!)} to {n.format(enrollment.grade.current.count!)}</strong>. Look at your child’s grade, not just the school total.</p>}
    </div>
    {hasExact?<figure className="rounded-lg border bg-background p-3">
      <figcaption><strong>{min===max?`${min} students in each class`:`${min}–${max} students per classroom`}</strong>
        <p className="text-sm text-muted-foreground">{classSizeDate(observedOn)} · {distribution.length} official {gradeLabel} classrooms, General Education and Integrated Co-Teaching</p>
      </figcaption>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Published classroom sizes">
        {distribution.map((row,i)=><li key={i} className="grid min-w-16 place-items-center rounded-lg border border-primary/20 bg-primary/10 px-2 py-1.5">
          <strong className="tabular-nums">{row.size}<span className="sr-only"> students</span></strong><span className="text-xs">{row.program}</span>
        </li>)}
      </ul>
      {benchmark&&<p className="mt-3 text-sm"><strong>{benchmark.school.toFixed(1)}</strong> students per class here vs. <strong>{benchmark.district.toFixed(1)}</strong> in District {benchmark.districtNumber} for the same grade and programs.</p>}
    </figure>:range&&<figure className="rounded-lg border bg-background p-3">
      <figcaption><strong>{range.min}–{range.max} students per classroom</strong>
        <p className="text-sm text-muted-foreground">{classSizeDate(observedOn)} · Reported range across {range.classes} official {gradeLabel} classes in {range.program}</p>
      </figcaption>
    </figure>}
    {cap&&<div className="rounded-lg border bg-background p-3" data-testid="cap-visual">
      <p className="font-semibold">{cap.meeting} of {cap.eligible} eligible official {gradeLabel} classes met the cap</p>
      <div aria-hidden="true" className="my-2 flex h-2.5 max-w-xs overflow-hidden rounded bg-amber-500"><span className="bg-emerald-600 dark:bg-emerald-400" style={{width:`${100*cap.meeting/cap.eligible}%`}}/></div>
      <p className="flex flex-wrap gap-x-4 text-sm"><span>{cap.meeting} at or below</span><span>{cap.eligible-cap.meeting} above</span></p>
      <p className="mt-1 text-xs text-muted-foreground">{classSizeDate(observedOn)} · NYCPS reports this grade-level count separately from class sizes. It includes only eligible classes.</p>
    </div>}
    <div className="space-y-1 border-t border-primary/20 pt-3">
      <h4 className="font-semibold">Ask on your school tour</h4>
      <p className="text-sm">“How many {gradeLabel} classrooms are you planning for next fall, and how many students do you expect in each?”</p>
      <p className="text-xs text-muted-foreground">Reported enrollment is not seat availability. This snapshot does not predict future classroom sizes or assignments.</p>
      <p className="flex flex-wrap gap-x-3 text-xs">
        <a href={CITY_CLASS_SOURCE} {...sourceProps}>NYCPS class-size reports</a>
        {enrollment&&<a href={REGISTER_SOURCE} {...sourceProps}>NYCPS enrollment registers</a>}
        {cap&&<a href={CITY_CAP_SOURCE} {...sourceProps}>NYCPS compliance report</a>}
      </p>
      {benchmark&&<a className="inline-block pt-1 text-sm font-medium text-primary underline" href={PILOT_DISTRICT_PATH+'#kindergarten-class-size'}>Compare District 2 kindergarten classes</a>}
    </div>
  </div>;
}
