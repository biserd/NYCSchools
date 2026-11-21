import React from 'react';
import { CAPS_SOURCE, CLASS_SIZE_SOURCE, REGISTER_SOURCE, PILOT_DISTRICT_PATH, CLASSROOM_ARTICLE_PATH,
  classTotals, type PilotData, type RegisterCell } from './classroomPilot';
import { enrollmentFromPilot } from './school-enrollment';
import { SchoolEnrollmentVisual } from './SchoolEnrollmentVisual';

const fmt = new Intl.NumberFormat('en-US');
const count = (cell: RegisterCell) => cell.count === null ? cell.status === 'suppressed' ? 'Suppressed' : 'Not reported' : fmt.format(cell.count);
const average = (n: number | null) => n == null ? 'Not reported' : n.toFixed(1);
const link = 'font-medium text-primary underline underline-offset-4';
const td = 'px-3 py-2';
const th = 'px-3 py-2 font-semibold';
const panel = 'rounded-xl border bg-card p-4 sm:p-6 space-y-4';

function registerChange(previous: RegisterCell, current: RegisterCell) {
  return previous.count === null || current.count === null ? null : current.count - previous.count;
}

function ClassroomOutcome({data}:{data:PilotData}) {
  const {school} = data;
  const kChange = registerChange(school.previousK,school.currentK);
  const k12Change = registerChange(school.previousK12,school.currentK12);
  const diverged = kChange !== null && kChange > 0 && k12Change !== null && k12Change < 0;
  const total = classTotals(school.programs);
  const sizes = school.distribution;
  const knownSizes = sizes.flatMap(row=>row.size === null ? [] : [row.size]);
  const range = sizes.length && knownSizes.length === sizes.length
    ? [Math.min(...knownSizes),Math.max(...knownSizes)] : null;
  const cap = school.cap;
  return <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-4" data-testid="classroom-parent-outcome">
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">What this means for your family</p>
      <h3 className="mt-1 text-xl sm:text-2xl font-bold">{diverged ? 'A smaller school, a bigger kindergarten' : 'Look at your child’s grade, not just total enrollment'}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {diverged ? 'P.S. 158 enrolled fewer K–12 students, but more kindergarteners. For a kindergarten decision, look at the size of the individual classrooms.' : 'The school register counts children enrolled. The class-size report tells you how they were grouped in the official classes it covers.'}
      </p>
    </div>
    {range && <figure className="rounded-lg border bg-background p-3">
      <figcaption>
        <strong>{range[0] === range[1] ? `${range[0]} students in each class` : `${range[0]}–${range[1]} students per classroom`}</strong>
        <p className="mt-1 text-sm text-muted-foreground">Oct. 31, 2026 · {total.classes} official kindergarten classes across General Education and Integrated Co-Teaching</p>
      </figcaption>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Reported classroom sizes">
        {sizes.flatMap(row=>Array.from({length:row.classes},(_,i)=><li key={`${row.program}:${row.label}:${i}`} className="grid min-w-16 place-items-center rounded-lg border border-primary/20 bg-primary/10 px-2 py-1.5">
          <span className="text-lg font-bold tabular-nums">{row.label}<span className="sr-only"> students</span></span>
          <span className="text-xs font-medium">{row.program}</span>
        </li>))}
      </ul>
    </figure>}
    {cap && <div className="rounded-lg border bg-background p-3" data-testid="cap-visual">
      <p className="font-semibold">{cap.meeting} of {cap.eligible} eligible official kindergarten classes met the cap</p>
      <div aria-hidden="true" className="my-2 flex h-2.5 gap-1" style={{maxWidth: Math.max(10,cap.eligible*4)+'rem'}}>
        {Array.from({length:cap.eligible},(_,i)=><span key={i} className={`flex-1 rounded-sm ${i<cap.meeting?'bg-emerald-600 dark:bg-emerald-400':'bg-amber-500 dark:bg-amber-300'}`}/>)}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span><span className="text-emerald-700 dark:text-emerald-300" aria-hidden="true">● </span>{cap.meeting} at or below</span>
        <span><span className="text-amber-700 dark:text-amber-300" aria-hidden="true">● </span>{cap.eligible-cap.meeting} above</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">NYCPS reports these eligible-class counts separately, not from the school average.</p>
    </div>}
    <div className="border-t border-primary/20 pt-3">
      <h4 className="font-semibold">Ask on your school tour</h4>
      <p className="mt-1 text-sm">“How many kindergarten classrooms are you planning for next fall, and how many students do you expect in each?”</p>
      <p className="mt-1 text-xs text-muted-foreground">Last October’s class size isn’t a promise about next fall, admission, or classroom assignment.</p>
      <a className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90" href={PILOT_DISTRICT_PATH+'#kindergarten-class-size'}>Compare District 2 kindergarten classes</a>
    </div>
  </div>;
}

function OfficialSources() {
  return <details className="border-t pt-3 text-sm text-muted-foreground">
    <summary className="cursor-pointer font-medium text-foreground">Sources and coverage</summary>
    <p className="mt-2">Register counts and classroom counts have different reporting scopes. The register excludes charter schools, community-based early childhood centers and adult education. The October 2026 register is preliminary; forecasts are not shown.</p>
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
      <li><a className={link} href={REGISTER_SOURCE} target="_blank" rel="nofollow noopener noreferrer">NYCPS Table B enrollment registers</a></li>
      <li><a className={link} href={CLASS_SIZE_SOURCE} target="_blank" rel="nofollow noopener noreferrer">NYCPS school and district class size workbooks</a></li>
      <li><a className={link} href={CAPS_SOURCE} target="_blank" rel="nofollow noopener noreferrer">NYCPS Table C cap counts</a></li>
    </ul>
  </details>;
}

function ClassroomComparison({data}:{data:PilotData}) {
  const {school,district,sources} = data;
  const totals = classTotals(school.programs);
  return <div className="min-w-0 space-y-3">
    <h3 className="text-lg font-semibold">How big were kindergarten classes?</h3>
    <figure className="rounded-md bg-muted/40 p-3 space-y-2">
      <figcaption className="text-sm font-medium">Average students per class</figcaption>
      {(() => {
        const districtAverage = district.classes ? district.students/district.classes : null;
        const max = Math.ceil(Math.max(totals.average ?? 0,districtAverage ?? 0,5)/5)*5;
        return <>
          {([['P.S. 158',totals.average,'bg-primary'],['District 2',districtAverage,'bg-foreground/50']] as const).map(([label,value,color])=>
            <div key={label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
              <span>{label}</span><span aria-hidden="true" className="h-3 rounded-sm bg-muted"><span className={`block h-full rounded-sm ${color}`} style={{width:`${100*(value??0)/max}%`}}/></span>
              <strong className="text-right tabular-nums">{average(value)}</strong>
            </div>)}
          <p className="text-xs text-muted-foreground">Common scale: 0 to {max} students per class.</p>
        </>;
      })()}
    </figure>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">P.S. 158 official kindergarten classes by program, students and average</caption>
        <thead className="bg-muted/60"><tr>{['Program','Students','Classes','Average'].map(x=><th key={x} className={th} scope="col">{x}</th>)}</tr></thead>
        <tbody>{school.programs.map(row=><tr key={row.program} className="border-b"><th className={th} scope="row">{row.program === 'Gen Ed' ? 'General education' : 'ICT'}</th><td className={td}>{row.students}</td><td className={td}>{row.classes}</td><td className={td}>{average(row.students/row.classes)}</td></tr>)}</tbody>
        <tfoot><tr><th className={th} scope="row">Combined</th><td className={td}>{totals.students}</td><td className={td}>{totals.classes}</td><td className={td}>{average(totals.average)}</td></tr></tfoot>
      </table>
    </div>
    <p className="text-sm text-muted-foreground">Students per official class. ICT means Integrated Co-Teaching. The October 31, 2026 snapshot uses the {sources.currentClasses} release. The register and classroom report count different populations.</p>
  </div>;
}

export function ClassroomPilotSchool({data}:{data:PilotData}) {
  const enrollment=enrollmentFromPilot(data);
  return <section className={`${panel} scroll-mt-20`} id="enrollment-and-class-size" aria-labelledby="classroom-school-title">
    <h2 id="classroom-school-title" className="text-xl font-semibold">Enrollment &amp; Class Size</h2>
    <ClassroomOutcome data={data}/>
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">{enrollment&&<SchoolEnrollmentVisual data={enrollment} embedded/>}<ClassroomComparison data={data}/></div>
    <p className="text-sm"><a className={link} href={CLASSROOM_ARTICLE_PATH}>Read how enrollment and class size changed across the district</a></p>
    <OfficialSources/>
  </section>;
}

export function ClassroomPilotDistrict({data}:{data:PilotData}) {
  const {district} = data;
  const weighted = average(district.classes ? district.students/district.classes : null);
  return <section className={`${panel} mb-8 scroll-mt-20`} id="kindergarten-class-size" aria-labelledby="district-class-size-title">
    <h2 className="text-xl font-semibold" id="district-class-size-title">Kindergarten enrollment and class size in District 2</h2>
    <p><strong>{weighted} students per class</strong> across {fmt.format(district.students)} students, {district.classes} classes and {district.rows.length} reporting schools, including P.S. 158.</p>
    <p className="text-sm text-muted-foreground">October 31, 2026 official kindergarten classes, General Education and ICT only. The district average divides total students by total classes. The register counts all reported kindergarteners and uses different eligibility rules.</p>
    <details open>
      <summary className="cursor-pointer font-medium">Compare the {district.rows.length} reporting schools</summary>
      <div className="overflow-x-auto mt-3" tabIndex={0} role="region" aria-label="District 2 kindergarten comparison table">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">District 2 reported kindergarten enrollment and official Gen Ed plus ICT classroom sizes</caption>
          <thead className="bg-muted/60"><tr>{['School','2025–26 K enrolled (audited)','Oct. 2026 K enrolled (preliminary)','Students in included classes','Included classes','Students per class'].map(x=><th key={x} className={th} scope="col">{x}</th>)}</tr></thead>
          <tbody>{district.rows.map(row=>{
            const size=classTotals(row.programs);
            return <tr className="border-b" key={row.dbn}><th className={th} scope="row">
              {row.path ? <a className={link} href={row.path+(row.dbn==='02M158'?'#enrollment-and-class-size':'')}>{row.name}</a> : row.name}
              <span className="block text-xs font-normal text-muted-foreground">{row.dbn}</span>
              </th><td className={td}>{count(row.previousK)}</td><td className={td}>{count(row.currentK)}</td><td className={td}>{size.students}</td><td className={td}>{size.classes}</td><td className={td}>{average(size.average)}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </details>
    <a className={`${link} text-sm`} href={CLASSROOM_ARTICLE_PATH}>How we compared enrollment and class size</a>
    <OfficialSources/>
  </section>;
}

export { ClassroomPilotDraft, PILOT_DRAFT_TITLE, PILOT_DRAFT_DESCRIPTION } from './ClassroomPilotDraft';
