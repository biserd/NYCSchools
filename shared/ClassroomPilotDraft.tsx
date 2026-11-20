import React from 'react';
import { ClassroomEnrollmentScatter } from './ClassroomEnrollmentScatter';
import { CAPS_SOURCE, CLASS_SIZE_SOURCE, REGISTER_SOURCE, PILOT_DISTRICT_PATH, PILOT_SCHOOL_PATH, CLASSROOM_ARTICLE,
  classTotals, type PilotData, type RegisterCell } from './classroomPilot';

export const PILOT_DRAFT_TITLE = CLASSROOM_ARTICLE.title;
export const PILOT_DRAFT_DESCRIPTION = CLASSROOM_ARTICLE.description;
const fmt = new Intl.NumberFormat('en-US');
const average = (n: number | null) => n == null ? 'Not reported' : n.toFixed(1);
const count = (cell: RegisterCell) => cell.count === null ? cell.status === 'suppressed' ? 'Suppressed' : 'Not reported' : fmt.format(cell.count);
const link = 'font-medium text-primary underline underline-offset-4';
const heading = 'scroll-mt-20 text-xl font-semibold sm:text-2xl';
const td = 'px-3 py-2';
const th = 'px-3 py-2 font-semibold';
const detail = (students:number,classes:number) => `${fmt.format(students)} students ÷ ${fmt.format(classes)} classes`;
const sections = [
  ['district-findings','District 2 findings'],['school-examples','Two school examples'],['ps-158','Inside P.S. 158'],
  ['city-context','NYC enrollment context'],['methods','How we compared'],['tour-questions','What to ask on a tour'],
] as const;

function MatchedResults({result,rows}:{result:NonNullable<PilotData['matched']>;rows:PilotData['district']['rows']}) {
  const categories = [
    ['Smaller average','smaller','bg-sky-700'],
    ['Same average','unchanged','bg-slate-500'],
    ['Larger average','larger','bg-amber-600'],
  ] as const;
  const matrix = result.matrix;
  return <div className="space-y-3">
    {result.points?.length ? <ClassroomEnrollmentScatter schools={result.points} rows={rows} featured={[...(result.examples??[]).map(school=>school.dbn),'02M158']}/>
      : result.fallingEnrollment>0 && <figure className="rounded-lg border bg-muted/30 p-4" data-testid="matched-class-size-chart">
      <figcaption className="font-semibold">Among the {result.fallingEnrollment} schools with fewer kindergarteners</figcaption>
      <p className="mt-1 text-sm text-muted-foreground">Each segment shows the share of these schools by change in average class size.</p>
      <div className="mt-3 flex h-4 overflow-hidden rounded-sm" aria-hidden="true">
        {categories.filter(([,key])=>result[key]>0).map(([label,key,fill])=><span key={label} className={fill} style={{width:`${100*result[key]/result.fallingEnrollment}%`}}/>)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {categories.map(([label,key,fill])=><li key={key}><span aria-hidden="true" className={`mr-1 inline-block h-2.5 w-2.5 rounded-sm ${fill}`}/><strong>{result[key]}</strong> {label.toLowerCase()}</li>)}
      </ul>
    </figure>}
    {matrix && <div className="overflow-x-auto" role="region" aria-label="Matched-school comparison table" tabIndex={0}>
      <table className="w-full border-collapse text-left text-sm" data-testid="matched-school-matrix">
        <caption className="py-2 text-left font-semibold">{result.schools} matched District 2 schools, October 2025 to October 2026</caption>
        <thead className="bg-muted/60"><tr>{['Kindergarten enrollment','Smaller class average','Same class average','Larger class average','Total schools'].map(x=><th key={x} className={th} scope="col">{x}</th>)}</tr></thead>
        <tbody>{([['Fell','falling'],['Stayed the same','flat'],['Rose','rising']] as const).map(([label,key])=>{
          const cell=matrix[key];
          return <tr key={key} className={`border-b ${key==='falling'?'bg-primary/5':''}`}>
            <th scope="row" className={th}>{label}</th><td className={td}>{cell.smaller}</td><td className={td}>{cell.unchanged}</td><td className={td}>{cell.larger}</td><td className={td}>{cell.smaller+cell.unchanged+cell.larger}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
  </div>;
}

export function ClassroomPilotDraft({data,showTitle=true}:{data:PilotData;showTitle?:boolean}) {
  const {school,district,priorDistrict,summary,matched} = data;
  const p=classTotals(data.priorSchoolPrograms), c=classTotals(school.programs);
  const districtPriorAvg=average(priorDistrict.students/priorDistrict.classes);
  const districtNowAvg=average(district.students/district.classes);
  const examples=matched?.examples??[];
  return <article className="mx-auto max-w-4xl space-y-8 rounded-xl border bg-card p-4 leading-relaxed sm:p-7" data-testid="classroom-pilot-draft">
    <header className="space-y-3">
      {showTitle&&<h1 className="text-3xl font-bold leading-tight sm:text-4xl">{PILOT_DRAFT_TITLE}</h1>}
      <p className="text-lg"><strong>Not necessarily.</strong> {matched ? <>In District 2, {matched.fallingEnrollment} of {matched.schools} comparable schools enrolled fewer kindergarteners. Of those {matched.fallingEnrollment}, {matched.smaller} had smaller classes on average, {matched.larger} had larger classes, and {matched.unchanged} had the same average.</> : <>Enrollment alone doesn’t tell you what happened to class size.</>} For parents, compare classroom sizes in the grade and program your child might enter.</p>
      <nav aria-label="On this page" className="rounded-lg border bg-muted/30 p-3 text-sm">
        <span className="font-semibold">In this article</span>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-2">{sections.filter(([id])=>id!=='school-examples'||examples.length).map(([id,label])=><li key={id}><a className={link} href={'#'+id}>{label}</a></li>)}</ul>
      </nav>
    </header>
    <section aria-labelledby="district-findings" className="space-y-3">
      <h2 id="district-findings" className={heading}>District 2 reported slightly more students in fewer classrooms</h2>
      <p>Across the schools in each NYCPS classroom release, District 2 reported {fmt.format(priorDistrict.students)} students in {priorDistrict.classes} official kindergarten classes in October 2025 and {fmt.format(district.students)} in {district.classes} classes in October 2026. The weighted average went from <strong>{districtPriorAvg} to {districtNowAvg} students per class</strong>. Both releases cover General Education and Integrated Co-Teaching (ICT) for this comparison.</p>
      <div className="overflow-x-auto" role="region" aria-label="October kindergarten classroom counts and averages" tabIndex={0}>
        <table className="w-full border-collapse text-left text-sm">
          <caption className="text-left pb-2 font-semibold">Official kindergarten classes, Gen Ed and ICT combined</caption>
          <thead className="bg-muted/60"><tr>{['Scope','October 2025 (revised February 2026)','October 2026 (November release)'].map(x=><th key={x} className={th} scope="col">{x}</th>)}</tr></thead>
          <tbody>
            <tr className="border-b"><th scope="row" className={th}>District 2 reporting schools</th><td className={td}><strong>{districtPriorAvg}</strong><br/>{detail(priorDistrict.students,priorDistrict.classes)} across {priorDistrict.schools} schools</td><td className={td}><strong>{districtNowAvg}</strong><br/>{detail(district.students,district.classes)} across {district.rows.length} schools</td></tr>
            <tr className="border-b"><th scope="row" className={th}>P.S. 158 Bayard Taylor</th><td className={td}><strong>{average(p.average)}</strong>{p.classes>0&&<><br/>{detail(p.students,p.classes)}</>}</td><td className={td}><strong>{average(c.average)}</strong><br/>{detail(c.students,c.classes)}</td></tr>
          </tbody>
        </table>
      </div>
      <p>The arithmetic matters: if the number of classrooms shrinks faster than the number of students, the average can rise even when enrollment falls. The workbook counts do not tell us why the number of classrooms changed.</p>
      {matched && <><h3 className="text-lg font-semibold">The district average doesn’t describe every school</h3>
        <p>The district rollup above uses all reporting schools in each classroom release. To compare changes at individual schools, we narrowed the analysis to {matched.schools} schools with kindergarten register counts and the same reported program categories in both October classroom files. The table below counts schools, not students or classes.</p>
        <MatchedResults result={matched} rows={district.rows}/>
      </>}
    </section>
    {examples.length>0 && <section aria-labelledby="school-examples" className="space-y-3">
      <h2 id="school-examples" className={heading}>Two schools with falling enrollment, two different results</h2>
      <p>These examples had the largest increase and decrease in average class size among schools with fewer enrolled kindergarteners. They illustrate how the student and classroom counts moved. They are not quality rankings.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {examples.map(({dbn,name,programs,before,after})=>{
          const larger = after.students*before.classes > before.students*after.classes;
          const path=district.rows.find(row=>row.dbn===dbn)?.path;
          return <div key={dbn} className="min-w-0 rounded-lg border p-4" data-testid="matched-school-example">
            <p className={`text-xs font-semibold uppercase tracking-wide ${larger?'text-amber-800 dark:text-amber-200':'text-sky-800 dark:text-sky-200'}`}>Classes got {larger?'larger':'smaller'} on average</p>
            <h3 className="mt-1 font-semibold">{path?<a className={link} href={path}>{name}</a>:name}</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div><dt className="inline font-medium">Kindergarten register: </dt><dd className="inline">{before.enrolled} → {after.enrolled}</dd></div>
              <div><dt className="inline font-medium">Students in included classes: </dt><dd className="inline">{before.students} → {after.students}</dd></div>
              <div><dt className="inline font-medium">Included classrooms: </dt><dd className="inline">{before.classes} → {after.classes}</dd></div>
              <div><dt className="inline font-medium">Average students per classroom: </dt><dd className="inline">{average(before.students/before.classes)} → {average(after.students/after.classes)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">October 2025 → October 2026. Included programs: {programs.join(' and ')} only.</p>
          </div>;
        })}
      </div>
      <p>One school reported fewer students in the included program but also one fewer classroom. The other reported fewer students in the included programs while the number of classrooms stayed the same. The register tells us who was enrolled in the grade. It doesn’t tell us how those students were grouped.</p>
    </section>}
    <section aria-labelledby="ps-158" className="space-y-3">
      <h2 id="ps-158" className={heading}>Inside P.S. 158: Averages can hide a bigger classroom</h2>
      <p>P.S. 158’s K–12 register count fell from {count(school.previousK12)} to {count(school.currentK12)}. Kindergarten went in the opposite direction, from {count(school.previousK)} to {count(school.currentK)}. The schoolwide decline would have told a kindergarten family the wrong thing about the size of the incoming grade.</p>
      <p>In October 2026 the average was {average(c.average)}, based on {c.students} students across {c.classes} included classes. {school.distribution.length>0&&<>The school workbook breaks that down as {school.distribution.map(row=>`${row.classes} ${row.program} ${row.classes===1?'class':'classes'} at ${row.label} students`).join('; ')}. </>}{school.cap&&<>Separately, NYCPS reported <strong>{school.cap.meeting} of {school.cap.eligible} eligible official kindergarten classes at or below the cap</strong>. </>}A single number for the school couldn’t tell us that.</p>
      <p>The register counted {count(school.currentK)} kindergarteners, while the classroom file counted {c.students} students in the included classes. The reports cover different populations and don’t explain the difference. Neither shows open seats or which class a child will join.</p>
      <a className={link} href={PILOT_SCHOOL_PATH+'#enrollment-and-class-size'}>See the classroom sizes and cap counts on the P.S. 158 profile</a>
    </section>
    <section aria-labelledby="city-context" className="space-y-3">
      <h2 id="city-context" className={heading}>The broader enrollment decline measures something different</h2>
      <p>K–12 enrollment across schools in the NYCPS register went from {fmt.format(summary.beforeTotal)} in the 2025–26 audited register to {fmt.format(summary.afterTotal)} in the preliminary October 31, 2026 register, a decline of {fmt.format(summary.beforeTotal-summary.afterTotal)}. Each register contains {fmt.format(summary.afterSchools)} school IDs, but {fmt.format(summary.addedSchools)} entered and {fmt.format(summary.removedSchools)} dropped out. Among the {fmt.format(summary.matchedSchools)} schools in both, the decline was {fmt.format(summary.matchedBefore-summary.matchedAfter)}.</p>
      <p>The register excludes charter schools and community-based early childhood centers. It does not tell us whether any school has room or whether kindergarten classes across the city got smaller. The workbook’s 2027–28 forecasts are not included in these figures.</p>
    </section>
    <section aria-labelledby="methods" className="space-y-3">
      <h2 id="methods" className={heading}>How we compared schools</h2>
      <ol className="ml-5 list-decimal space-y-2">
        <li><strong>Same grade and class type.</strong> Kindergarten official classes only. We excluded cluster subjects such as physical education and didn’t pool Gen Ed and ICT with other program categories.</li>
        <li><strong>Two October observations.</strong> We used the February revision of the October 2025 snapshot and the November release of the October 2026 snapshot. February doesn’t add another observation. June is a separate snapshot, not used here.</li>
        <li><strong>Match by official school ID.</strong> Schools needed a reported kindergarten register count and the same included program types in both years. The distribution of classrooms between those programs can still change.</li>
        <li><strong>Check the counts.</strong> We added students and classes separately, reconciled the sums to the official district workbooks, and used unrounded averages to classify changes. The first register is audited and the second preliminary. This comparison cannot identify what caused class size to change.</li>
      </ol>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {([[REGISTER_SOURCE,'NYCPS Table B enrollment registers'],[CLASS_SIZE_SOURCE,'NYCPS school and district class size workbooks'],[CAPS_SOURCE,'NYCPS Table C cap counts']] as const).map(([url,label])=><li key={url}><a className={link} href={url} target="_blank" rel="nofollow noopener noreferrer">{label}</a></li>)}
      </ul>
    </section>
    <section aria-labelledby="tour-questions" className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <h2 id="tour-questions" className={heading}>What to ask on a school tour</h2>
      <p>Start with the grade your child will enter. If classroom size matters to your family, look at the number of classrooms, the observed size range, and differences between programs. Ask:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>How many kindergarten classrooms are you planning for next fall?</li>
        <li>How many students do you expect in each, and does that differ by program?</li>
        <li>When will the classroom plan be ready, and could it change after offers?</li>
      </ul>
      <a className={link} href={PILOT_DISTRICT_PATH+'#kindergarten-class-size'}>Compare District 2 kindergarten classrooms before your visit</a>
    </section>
  </article>;
}
