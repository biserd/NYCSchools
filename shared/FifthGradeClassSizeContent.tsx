import React, { useState } from 'react';
import { CLASS_SIZE_WORKBOOK, NYSED_GRADE5_ARCHIVE, gradeFiveStudy as study, signedPoint, studySubjects,
  type GradeFiveSubject } from './fifth-grade-class-size-study';

const title='scroll-mt-20 text-2xl font-bold tracking-tight sm:text-3xl';
const panel='my-5 rounded-xl border bg-card p-4 sm:p-6';
const link='font-medium text-primary underline underline-offset-4';
const pct=(n:number)=>n.toFixed(1)+'%';
const index = [['spring-2026-results','The science gap'],['before-october','Before the class snapshot'],
  ['adjusted-results','After adjustment'],['study-method','How we compared schools'],['what-parents-can-use','What parents can use']] as const;

function ClassSizeBands(){
  const [subject,setSubject]=useState<GradeFiveSubject>('Science');
  const gap=study.bands[2].rates[subject]-study.bands[0].rates[subject];
  return <figure className={panel} aria-labelledby="size-band-figure" data-testid="grade5-band-chart">
    <figcaption id="size-band-figure" className="font-semibold">Spring 2026 grade 5 proficiency by class size</figcaption>
    <p className="mt-1 text-sm text-muted-foreground">Same {study.modelSchools} NYC district schools in all three subjects. Each school counts once.</p>
    <div role="group" aria-label="Test subject" className="my-4 flex flex-wrap gap-2">
      {studySubjects.map(s=><button key={s} type="button" aria-pressed={subject===s} aria-controls="size-band-values"
        className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10"
        onClick={()=>setSubject(s)}>{s}</button>)}
    </div>
    <div id="size-band-values" className="space-y-4" aria-live="polite">
      <div className="flex justify-between text-xs font-medium text-muted-foreground"><span>Average students per class</span><span>{subject} proficiency</span></div>
      {study.bands.map((b,i)=><div className="space-y-1.5" key={b.label}>
        <div className="flex items-baseline justify-between gap-2"><p className="text-sm font-medium">{b.label} <span className="font-normal text-muted-foreground">· {b.schools} schools</span></p>
          <strong className="tabular-nums">{pct(b.rates[subject])}</strong></div>
        <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${i===2?'bg-primary':'bg-primary/55'}`} style={{width:pct(b.rates[subject])}}/></div>
      </div>)}
      <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>50%</span><span>100%</span></div>
      <p className="rounded-md bg-primary/5 p-3 text-sm"><strong>{gap.toFixed(1)} percentage points</strong> between the under-20 and 24-or-more groups before any adjustment.</p>
    </div>
    <details className="mt-4 rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">See the values for all three subjects</summary>
      <div className="mt-2 overflow-x-auto" role="region" aria-label="Spring 2026 class-size band data" tabIndex={0}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Average school proficiency by class-size band, spring 2026</caption>
          <thead className="bg-muted/50"><tr>{['Students per class','Schools',...studySubjects].map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
          <tbody>{study.bands.map(b=><tr key={b.label} className="border-b"><th scope="row" className="p-2 font-medium">{b.label}</th>
            <td className="p-2 tabular-nums">{b.schools}</td>{studySubjects.map(s=><td key={s} className="p-2 tabular-nums">{pct(b.rates[s])}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </figure>;
}

function SnapshotTimeline(){
  return <ol aria-label="Timeline of the classroom snapshot and assessments" data-testid="grade5-timeline" className="my-5 grid gap-2 sm:grid-cols-3">
    {[
      ['1','Spring 2025','The prior fifth-grade cohort took its tests.'],
      ['2','October 31, 2025','NYCPS counted the next school year’s official classes.'],
      ['3','Spring 2026','The later fifth-grade cohort took its tests.'],
    ].map(([num,date,caption])=><li key={num} className="flex min-w-0 gap-3 rounded-lg border bg-card p-3 sm:p-4">
      <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{num}</span>
      <div><p className="font-semibold">{date}</p><p className="mt-1 text-sm text-muted-foreground">{caption}</p></div>
    </li>)}
  </ol>;
}

function PriorComparison(){
  return <figure className={panel} aria-labelledby="prior-figure" data-testid="grade5-prior-chart">
    <figcaption id="prior-figure" className="font-semibold">Larger fall classrooms were linked to higher scores even before that fall</figcaption>
    <p className="mt-1 text-sm text-muted-foreground">Unadjusted association for five additional students per class, in percentage points of proficiency.</p>
    <div className="mt-4 space-y-5">
      {studySubjects.map(s=><div key={s}>
        <p className="mb-2 text-sm font-semibold">{s}</p>
        <div className="space-y-2">
          {([['Spring 2025',study.estimates[s].prior,'bg-sky-600'],['Spring 2026',study.estimates[s].current,'bg-primary']] as const).map(([label,v,color])=><div key={label} className="grid grid-cols-[5.4rem_minmax(0,1fr)_3.2rem] items-center gap-2 text-sm">
            <span>{label}</span><span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full ${color}`} style={{width:`${100*v/6}%`}}/></span>
            <strong className="text-right tabular-nums">{signedPoint(v)}</strong>
          </div>)}
        </div>
      </div>)}
      <div aria-hidden="true" className="ml-[5.9rem] mr-[3.6rem] flex justify-between text-xs text-muted-foreground"><span>0 pp</span><span>+3 pp</span><span>+6 pp</span></div>
    </div>
  </figure>;
}

function AdjustedComparison(){
  const coordinate = (v:number)=>(v+2.5)*20;
  return <figure className={panel} aria-labelledby="adjusted-figure" data-testid="grade5-adjusted-chart">
    <figcaption id="adjusted-figure" className="font-semibold">Once schools were compared on a more similar footing, estimates were near zero</figcaption>
    <p className="mt-1 text-sm text-muted-foreground">Adjusted association for five additional students per class. The line shows the 95% confidence interval.</p>
    <div className="mt-5 space-y-4">
      {studySubjects.map(s=>{
        const {adjusted,low,high}=study.estimates[s];
        return <div key={s} className="space-y-1">
          <div className="flex flex-wrap justify-between gap-x-3 text-sm"><strong>{s}</strong>
            <span className="tabular-nums"><strong>{signedPoint(adjusted)} pp</strong> <span className="text-muted-foreground">({signedPoint(low)} to {signedPoint(high)})</span></span></div>
          <div aria-hidden="true" className="relative h-6 rounded-md bg-muted/45">
            <span className="absolute left-1/2 h-full w-px bg-muted-foreground/50"/>
            <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-primary" style={{left:`${coordinate(low)}%`,width:`${(high-low)*20}%`}}/>
            <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{left:`${coordinate(adjusted)}%`}}/>
          </div>
        </div>;
      })}
      <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground"><span>−2.5 pp</span><span>0 pp</span><span>+2.5 pp</span></div>
    </div>
  </figure>;
}

function Cohort(){
  return <figure className={panel} aria-labelledby="cohort-figure" data-testid="grade5-cohort-chart">
    <figcaption id="cohort-figure" className="font-semibold">Which schools made it into the comparison?</figcaption>
    <ol className="mt-4 space-y-4">
      {[
        [study.eligibleSchools,'Matching NYC district profiles with eligible October classrooms'],
        [study.springResultSchools,'Exact counts in all three spring 2026 subjects'],
        [study.pairedSchools,'Exact counts in all three subjects in both springs'],
        [study.modelSchools,'At least 20 tested per subject in each spring'],
      ].map(([n,caption])=><li key={caption}>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm"><span>{caption}</span><strong className="tabular-nums">{n}</strong></div>
        <div aria-hidden="true" className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${100*Number(n)/study.eligibleSchools}%`}}/></div>
      </li>)}
    </ol>
  </figure>;
}

export function FifthGradeClassSizeContent(){
  return <article className="mx-auto max-w-4xl space-y-9 leading-relaxed" data-testid="fifth-grade-class-size-study">
    <div className="space-y-3 text-lg">
      <p>In spring 2026, NYC schools averaging fewer than 20 students per fifth-grade class had <strong>38.3% science proficiency</strong>. At schools averaging 24 or more, it was <strong>47.1%</strong>. That looks like an advantage for larger classes, until you check when it started.</p>
      <p>Nearly the same science pattern was visible in <strong>spring 2025</strong>, before the fall classrooms were counted. We matched October class sizes to three subjects at <strong>680 NYC district schools</strong> to see what class size added once we knew how those schools had scored before.</p>
    </div>
    <nav aria-label="In this analysis" className="rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="font-semibold">In this analysis</p><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{index.map(([id,label])=><li key={id}><a href={'#'+id} className={link}>{label}</a></li>)}</ul>
    </nav>
    <section className="space-y-3" aria-labelledby="spring-2026-results">
      <h2 id="spring-2026-results" className={title}>What did larger fifth-grade classes look like in the raw data?</h2>
      <p>Science had the widest gap between the smallest and largest class-size groups. The same larger-class group also led on English language arts (ELA) and math. These are averages of school proficiency rates, not the percentage of all students in each group who were proficient.</p>
      <ClassSizeBands/>
      <p>The gap is real in the published figures. But comparing those groups alone leaves out how the schools differed before the snapshot.</p>
    </section>
    <section className="space-y-3" aria-labelledby="before-october">
      <h2 id="before-october" className={title}>The same pattern showed up before October 2025</h2>
      <p>For every five additional students in a school’s average October class, spring 2026 science proficiency was about <strong>4.7 percentage points higher</strong> before adjustment. Apply the same October classroom measure to the previous spring’s results, and the gap was also about <strong>4.7 points</strong>.</p>
      <SnapshotTimeline/>
      <PriorComparison/>
      <p>The October snapshot came after the 2025 tests, so it cannot explain those earlier scores. This check shows that the schools already differed. It does not rule out a role for classroom conditions in earlier years.</p>
    </section>
    <section className="space-y-3" aria-labelledby="adjusted-results">
      <h2 id="adjusted-results" className={title}>What changed after accounting for prior scores?</h2>
      <p>Class size added little to what the prior school results already told us. We compared schools within the same district and accounted for the school’s spring 2025 rate in the same subject and the share of students in Integrated Co-Teaching (ICT) among the classes we counted.</p>
      <AdjustedComparison/>
      <p>Every adjusted interval crossed zero. The same overall conclusion held when we weighted by the number of students tested, changed the testing threshold, or restricted class size to general-education classrooms. This does <strong>not</strong> mean class size has no effect. It means this school-level comparison could not separate a clear association from existing school differences.</p>
    </section>
    <section className="space-y-3" aria-labelledby="study-method">
      <h2 id="study-method" className={title}>How we matched NYC class sizes to test results</h2>
      <p>We matched official school IDs across the October 31, 2025 class-size snapshot and the final state assessment archive. The February 2026 classroom workbook revises that October observation; it is not a second class count.</p>
      <Cohort/>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Class size:</strong> The school’s reported grade 5 students divided by its official general education and ICT classes, combined using the actual student and class counts. This is not the schoolwide pupil-to-teacher ratio.</li>
        <li><strong>Proficiency:</strong> Exact proficient counts divided by tested counts for NYSED’s grade 5 All Students rows. Students on those tests can include programs outside the classroom calculation. We could not link individual students to their classrooms.</li>
        <li><strong>Comparison:</strong> One observation per school for each subject, with a separate model for each subject. We accounted for the shared district context when estimating uncertainty. No ratings were changed.</li>
      </ul>
      <p className="text-sm text-muted-foreground">Charters, non-geographic districts and schools without a verified match were not included. Schools left out of the main comparison tended to have smaller classes, so these findings are not a blanket result for every NYC classroom.</p>
      <p className="text-sm"><strong>Primary sources:</strong>{' '}<a className={link} href={CLASS_SIZE_WORKBOOK} target="_blank" rel="nofollow noopener noreferrer">NYCPS revised October 2025 school workbook</a>{' '}and{' '}<a className={link} href={NYSED_GRADE5_ARCHIVE} target="_blank" rel="nofollow noopener noreferrer">NYSED 2025–26 School Report Card archive</a>.</p>
    </section>
    <section className="space-y-3" aria-labelledby="what-parents-can-use">
      <h2 id="what-parents-can-use" className={title}>What should parents look at on a school profile?</h2>
      <p>Use the class-size panel to learn about the grade and program your child might enter. Use the test results to understand how a school’s past cohorts performed. Neither number tells you what will happen to an individual child.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Pick the grade first.</strong> On a profile such as <a className={link} href="/school/02m158-ps-158-bayard-taylor">P.S. 158 Bayard Taylor</a>, choose grade 5 in the class-size panel instead of relying on the schoolwide enrollment total.</li>
        <li><strong>Compare like with like.</strong> Use a published benchmark, such as the one on the <a className={link} href="/district/2">District 2 page</a>, for the same grade and program. Check the range and number of classrooms, not just the average.</li>
        <li><strong>Ask for the current picture.</strong> On a tour, ask how many sections the school expects, how support works in each program and when those plans will be final.</li>
      </ul>
      <p>For a second example of how classroom counts change the story, read our <a className={link} href="/blog/does-falling-enrollment-mean-smaller-classes">District 2 analysis of falling enrollment and class size</a>.</p>
    </section>
  </article>;
}
