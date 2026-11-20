import React, { useId, useState } from 'react';
import type { DistrictRow, MatchedExample } from './classroomPilot';

const plot = { left:46, right:444, top:16, bottom:217, width:464, height:253 };
const ticks = [-2,-1,0,1,2];

export function classroomMovement(school: MatchedExample) {
  const {before,after}=school;
  return {
    enrollment:after.enrolled-before.enrolled,
    average:(after.students*before.classes-before.students*after.classes)/(before.classes*after.classes),
  };
}

function signed(n:number,precision=0) {
  if(n===0) return '0';
  const magnitude=Math.abs(n);
  return (n>0?'+':'−')+magnitude.toFixed(precision===1&&magnitude<0.05?2:precision);
}

const legend = [
  ['Fewer enrolled, larger classes','fill-amber-500','bg-amber-500'],
  ['Fewer enrolled, smaller classes','fill-sky-600','bg-sky-600'],
  ['Other schools','fill-slate-500','bg-slate-500'],
] as const;
const formatAverage=(point:MatchedExample['before'])=>(point.students/point.classes).toFixed(1);

export function ClassroomEnrollmentScatter({schools,rows,featured}:{schools:MatchedExample[];rows:DistrictRow[];featured:string[]}) {
  const id=useId();
  const [schoolId,setSchoolId]=useState(featured[0]??schools[0]?.dbn??'');
  const [focusDecline,setFocusDecline]=useState(false);
  if(!schools.length) return null;
  const data=schools.map(school=>({school,...classroomMovement(school)}));
  const selected=data.find(point=>point.school.dbn===schoolId)??data[0];
  const sx=Math.max(5,Math.ceil(Math.max(...data.map(point=>Math.abs(point.enrollment)))/10)*5);
  const sy=Math.max(1,Math.ceil(Math.max(...data.map(point=>Math.abs(point.average)))/2));
  const X=(change:number)=>plot.left+(0.5+change/(4*sx))*(plot.right-plot.left);
  const Y=(change:number)=>plot.bottom-(0.5+change/(4*sy))*(plot.bottom-plot.top);
  const getGroup=(point:typeof selected)=>point.enrollment<0&&point.average>0?0:point.enrollment<0&&point.average<0?1:2;
  const counters=[0,0,0];
  data.forEach(point=>counters[getGroup(point)]++);
  const path=rows.find(row=>row.dbn===selected.school.dbn)?.path;
  const {before,after}=selected.school;
  const featuredSchools=[...new Set(featured)].flatMap(key=>schools.find(school=>school.dbn===key)??[]);
  return <figure id="enrollment-movement" className="scroll-mt-20 overflow-hidden rounded-xl border border-primary/25 bg-primary/5" aria-labelledby={id+'-heading'} data-testid="enrollment-movement-chart">
    <figcaption className="space-y-1 border-b border-primary/15 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">District 2 · October 2025 to October 2026</p>
      <h3 id={id+'-heading'} className="text-xl font-bold tracking-tight sm:text-2xl">Fewer kindergarteners didn’t always mean smaller classes</h3>
      <p className="text-sm text-muted-foreground">Each dot is one of the {schools.length} matched schools. The amber dots show the {counters[0]} schools that enrolled fewer kindergarteners but had larger classes on average.</p>
    </figcaption>
    <div className="grid min-w-0 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-lg border bg-background p-2 sm:p-3">
        <p className="px-1 text-xs font-semibold">Change in average students per class</p>
        <svg viewBox={`0 0 ${plot.width} ${plot.height}`} className="block w-full" role="img" aria-labelledby={id+'-plot-title '+id+'-plot-desc'}>
          <title id={id+'-plot-title'}>{`Enrollment change and class-size change at ${schools.length} matched schools`}</title>
          <desc id={id+'-plot-desc'}>Moving left means fewer kindergarteners enrolled; moving up means larger average classes. Use the school selector to read the values behind any dot.</desc>
          <rect x={plot.left} y={plot.top} width={X(0)-plot.left} height={Y(0)-plot.top} className="fill-amber-500/10"/>
          <rect x={plot.left} y={Y(0)} width={X(0)-plot.left} height={plot.bottom-Y(0)} className="fill-sky-500/10"/>
          {ticks.map(tick=><g key={tick} className="text-muted-foreground">
            <line x1={X(tick*sx)} x2={X(tick*sx)} y1={plot.top} y2={plot.bottom} className={tick?'stroke-border':'stroke-muted-foreground'} strokeDasharray={tick?undefined:'4 3'}/>
            <line x1={plot.left} x2={plot.right} y1={Y(tick*sy)} y2={Y(tick*sy)} className={tick?'stroke-border':'stroke-muted-foreground'} strokeDasharray={tick?undefined:'4 3'}/>
            <text x={X(tick*sx)} y={plot.bottom+22} textAnchor="middle" className="fill-current" fontSize="14">{signed(tick*sx)}</text>
            <text x={plot.left-8} y={Y(tick*sy)+5} textAnchor="end" className="fill-current" fontSize="14">{signed(tick*sy)}</text>
          </g>)}
          {data.map(point=>{
            const active=point.school.dbn===selected.school.dbn;
            const faded=focusDecline&&point.enrollment>=0&&!active;
            return <g key={point.school.dbn} transform={`translate(${X(point.enrollment)} ${Y(point.average)})`} opacity={faded?0.25:1}>
              <title>{`${point.school.name}: ${signed(point.enrollment)} enrolled; ${signed(point.average,1)} students per class`}</title>
              <circle r="6" className={`${legend[getGroup(point)][1]} stroke-background`} strokeWidth="1.5"/>
              <circle r="9" fill="transparent" className="cursor-pointer" data-school-point={point.school.dbn} onClick={()=>setSchoolId(point.school.dbn)}/>
            </g>;
          })}
          <circle cx={X(selected.enrollment)} cy={Y(selected.average)} r="10" fill="none" className="pointer-events-none stroke-foreground" strokeWidth="2"/>
        </svg>
        <p className="text-center text-xs font-semibold">Change in kindergarten enrollment</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs" aria-label="Chart legend">
          {legend.map(([label,,color],i)=><p key={label} className="flex items-center gap-1.5"><span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true"/>{label} <strong>{counters[i]}</strong></p>)}
        </div>
        <label className="mt-3 flex items-center gap-2 border-t pt-2 text-xs">
          <input type="checkbox" checked={focusDecline} onChange={event=>setFocusDecline(event.currentTarget.checked)} className="h-4 w-4 accent-primary"/>
          Highlight schools with falling enrollment
        </label>
      </div>
      <div className="min-w-0 rounded-lg border bg-card p-3.5 sm:p-4">
        <label className="block text-sm font-semibold" htmlFor={id+'-select'}>Explore a school</label>
        <select className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" id={id+'-select'} value={selected.school.dbn} onChange={event=>setSchoolId(event.currentTarget.value)}>
          {schools.map(school=><option value={school.dbn} key={school.dbn}>{school.name}</option>)}
        </select>
        <div className="mt-3" aria-live="polite" data-testid="enrollment-movement-detail">
          <p className="text-sm font-bold">{selected.school.name}</p>
          <p className="my-1 text-xs font-semibold text-primary">{signed(selected.enrollment)} enrolled · {signed(selected.average,1)} students per class</p>
          <p className="mb-2 text-xs text-muted-foreground">Included: {selected.school.programs.join(' and ')} · before → after</p>
          <dl className="space-y-2 text-xs sm:text-sm">
            {([
              ['Kindergarten enrolled',before.enrolled,after.enrolled],
              ['Students in included classes',before.students,after.students],
              ['Included classrooms',before.classes,after.classes],
              ['Average students per class',formatAverage(before),formatAverage(after)],
            ] as const).map(([label,a,b])=><div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-b pb-1.5">
              <dt>{label}</dt><dd className="font-semibold tabular-nums">{a} <span className="text-muted-foreground">→</span> {b}</dd>
            </div>)}
          </dl>
          {path&&<a href={path} className="mt-2 inline-block text-xs font-semibold text-primary underline">Open school profile</a>}
        </div>
        {featuredSchools.length>0&&<div className="mt-3 flex flex-wrap gap-1.5" aria-label="Featured schools">
          {featuredSchools.map(school=><button type="button" key={school.dbn} aria-pressed={school.dbn===selected.school.dbn} onClick={()=>setSchoolId(school.dbn)} className="rounded-full border px-2 py-1 text-xs font-medium aria-pressed:border-primary aria-pressed:bg-primary/10">
            P.S. {Number(school.dbn.slice(-3))}
          </button>)}
        </div>}
      </div>
    </div>
    <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">Sources: NYCPS Table B registers and school class-size files. Plotted changes use unrounded averages. Some dots may overlap; the school selector includes all {schools.length} schools.</p>
  </figure>;
}
