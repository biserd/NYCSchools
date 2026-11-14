import React, { useState } from 'react';
import { GUIDE_REVIEWED, type GuideLink, type ParentGuide } from './parent-guides';
import type { GuideData } from './parent-guide-data';
import { SurveyResultsContent } from './SurveyResultsContent';
import { PrivateCostComparison } from './PrivateCostComparison';
import { ContinuityChecks } from './ContinuityChecks';

export function GuideAnchor({ link, className = 'text-primary underline underline-offset-4' }: { link: GuideLink; className?: string }) {
  const external = /^https?:/.test(link.href);
  return <a className={className} href={link.href} {...(external ? { target: '_blank', rel: 'nofollow noopener noreferrer', 'data-external-nofollow': '' } : {})}>{link.label}</a>;
}
const cell = 'px-4 py-3 text-left align-top border-b';
const districtGroups = [
  { area: 'Manhattan', ids: [1, 2, 3, 4, 5, 6] }, { area: 'Bronx', ids: [7, 8, 9, 10, 11, 12] },
  { area: 'Brooklyn', ids: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 32] },
  { area: 'Queens', ids: [24, 25, 26, 27, 28, 29, 30] }, { area: 'Staten Island', ids: [31] },
];

function DataMark({label, value, max, unit = '', color = 'bg-primary'}: {label: string; value?: number | null; max: number; unit?: string; color?: string}) {
  return <div className="space-y-1.5">
    <div className="flex justify-between gap-3 text-sm"><span>{label}</span><strong className="shrink-0 tabular-nums">{value == null ? 'Not reported' : value.toLocaleString('en-US') + unit}</strong></div>
    {value != null && <div aria-hidden="true" className="h-3 rounded-full bg-muted"><div className={`h-full rounded-full ${color} transition-[width] duration-300 motion-reduce:transition-none`} style={{width: `${Math.min(100, value / max * 100)}%`}} /></div>}
  </div>;
}

function ShortlistExplorer({ guide, data, pending }: { guide: ParentGuide; data?: GuideData; pending: boolean }) {
  const [district, setDistrict] = useState(2);
  const preK = guide.shortlistMode === 'pre-k';
  const evidence = guide.verified!;
  const picks = data?.districtPicks;
  const rows = picks?.filter(row => row.district === district) ?? [];
  const maxEnrollment = Math.max(1, ...rows.map(row => row.enrolled ?? 0));
  const borough = districtGroups.find(group => group.ids.includes(district))?.area;
  const compared = rows.flatMap(row => row.enrolled == null ? [] : [row.enrolled]);
  const gap = compared.length === 2 ? Math.abs(compared[0] - compared[1]) : null;
  return <section className="my-8 space-y-5" aria-labelledby="verified-examples">
    <h2 id="verified-examples" className="text-2xl font-semibold">Compare options in your district</h2>
    <p className="text-muted-foreground">Choose a district to see up to two {preK ? 'pre-K programs' : 'kindergarten schools'} and the data behind them. These are starting points, not a ranking or a list of open seats.</p>
    <label className="block max-w-sm space-y-1 text-sm font-medium"><span className="block">School district</span><select className="min-h-11 w-full rounded-md border bg-background px-3 text-base" value={district} onChange={e => setDistrict(Number(e.target.value))}>{districtGroups.map(({area, ids}) => <optgroup key={area} label={area}>{ids.map(id => <option key={id} value={id}>District {id}</option>)}</optgroup>)}</select></label>
    <p role="status" className="text-sm text-muted-foreground">District {district} · {borough}{picks && ` · ${rows.length} ${rows.length === 1 ? 'option' : 'options'}`}</p>
    {!rows.length && <p>{picks ? 'No verified records for this district.' : pending ? 'Loading district examples…' : 'District examples are temporarily unavailable.'} <GuideAnchor link={{ label: 'Browse the directory', href: preK ? '/program/prek' : '/nyc-schools/elementary-schools' }}/></p>}
    {rows.length > 0 && <div className="grid gap-4 sm:grid-cols-2" data-testid="district-shortlist" aria-label="District examples">
      {rows.map(row => <section key={row.id} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
        <header><p className="text-xs font-semibold uppercase tracking-wide text-primary">District {district} · {row.id}</p>
          <h3 className="mt-1 text-lg font-semibold">{row.href ? <GuideAnchor link={{href:row.href,label:row.name}} /> : row.name}</h3>
          {row.grades && <p className="mt-1 text-sm text-muted-foreground">Reported grade range: {row.grades}</p>}
        </header>
        {row.detail && <p className="text-sm">{row.detail}</p>}
        <figure className="space-y-3" data-testid="shortlist-chart">
          <figcaption className="text-sm font-semibold">2025–26 {preK ? 'pre-K' : 'kindergarten'} enrollment</figcaption>
          <DataMark label="Children enrolled" value={row.enrolled} max={maxEnrollment}/>
          {!preK && <><p className="pt-2 text-sm font-semibold">Spring 2026 grade 3 proficiency</p>
            <DataMark label="ELA" value={row.evidence?.assessment?.ela} max={100} unit="%"/>
            <DataMark label="Math" value={row.evidence?.assessment?.math} max={100} unit="%" color="bg-teal-600 dark:bg-teal-400"/>
          </>}
          {preK && row.evidence?.family && <><p className="pt-2 text-sm font-semibold">2026 Birth-to-5 family survey</p>
            <DataMark label="Outreach to parents" value={row.evidence.family.outreach} max={100} unit="/100" color="bg-teal-600 dark:bg-teal-400"/>
            <p className="text-sm">Family responses: {row.evidence.family.count ?? 'Not reported'}{row.evidence.teacher && ` · Teacher responses: ${row.evidence.teacher.count ?? 'Not reported'}`}{row.evidence.teacher && !row.evidence.teacher.hasTopics && ' (no teacher topic scores published)'}</p>
          </>}
        </figure>
        <details className="mt-auto border-t pt-2"><summary className="min-h-11 py-2 text-sm font-medium">What to ask on a visit</summary>
          <p className="pb-2 text-sm text-muted-foreground">{row.visit || (preK ? 'Confirm pickup time, the seat type you need, and what care is available outside the school day.' : 'Ask how teachers help children settle in, how caregivers hear about progress, and what happens after dismissal.')}</p>
        </details>
      </section>)}
    </div>}
    {gap !== null && <p className="rounded-lg bg-primary/5 p-3 text-sm"><strong>{gap === 0 ? 'Same reported enrollment.' : `${gap.toLocaleString('en-US')} students apart.`}</strong> {preK ? 'Ask how the program splits children between rooms and whether your preferred hours are available.' : 'Ask how many classrooms the school expects, not just how many children were enrolled.'}</p>}
    <p className="text-sm text-muted-foreground">{preK ? 'Enrollment counts are not seats available. Where shown, Birth-to-5 feedback describes the whole center, not just pre-K.' : 'Enrollment counts are not seats available or class sizes. ELA and math bars run from 0% to 100% and describe tested third graders, not kindergarten.'} {rows.some(row => row.enrolled != null) && `Enrollment bars are relative to the largest published count shown (${maxEnrollment.toLocaleString('en-US')}).`}</p>
    <p className="text-sm"><GuideAnchor link={{ label: `Explore more District ${district} schools`, href: `/district/${district}` }} /></p>
    <details className="rounded-lg border p-3"><summary className="min-h-11 py-2 text-sm font-medium">How we picked these examples</summary><p className="text-sm text-muted-foreground">We keep verified editorial examples where available. Remaining places are filled from district schools in our database with published 2025–26 enrollment in the relevant grade. When two database examples are needed, we choose schools near the lower and upper enrollment quartiles to illustrate different program sizes. When one is needed, we choose a school near the middle. We don’t choose schools by test score.</p></details>
  </section>;
}

function VerifiedExamples({ evidence }: { evidence: NonNullable<ParentGuide['verified']> }) {
  return <section className="my-8 space-y-4" aria-labelledby="verified-examples">
    <h2 id="verified-examples" className="text-2xl font-semibold">{evidence.heading}</h2>
    <p className="text-sm text-muted-foreground md:hidden">Swipe the table to see all columns and sources.</p>
    <div className="overflow-x-auto rounded-lg border" role="region" aria-labelledby="verified-examples" tabIndex={0}>
      <table className="w-full text-sm leading-relaxed">
        <caption className="p-4 text-left text-muted-foreground">{evidence.caption}</caption>
        <thead className="bg-muted"><tr><th scope="col" className={cell}>{evidence.firstColumn ?? 'School or program'}</th>{evidence.columns.map(column => <th key={column} scope="col" className={cell}>{column}</th>)}<th scope="col" className={cell}>Official sources</th></tr></thead>
        <tbody>{evidence.rows.map(row => <tr key={row.name}>
          <th scope="row" className={`${cell} min-w-36 font-medium`}>{row.profile ? <GuideAnchor link={{ href: row.profile, label: row.name }} /> : row.name}</th>
          {row.cells.map((value, index) => <td className={`${cell} min-w-36`} key={evidence.columns[index]}>{value}</td>)}
          <td className={`${cell} min-w-32`}><ul className="space-y-2">{row.sources.map(source => <li key={source.href}><GuideAnchor link={source} /></li>)}</ul></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 leading-relaxed"><strong>What this means for your shortlist:</strong> {evidence.takeaway}</p>
  </section>;
}
export function GuideEvidence({ data, showRecordSources = true }: { data: GuideData; showRecordSources?: boolean }) {
  const [filter,setFilter] = useState('');
  const [district,setDistrict] = useState('');
  const [query,setQuery] = useState('');
  const [page,setPage] = useState(0);
  if (!data.summary.length) return null;
  const filtered = data.rows.filter(row=>(!filter || row.tags?.includes(filter)) && (!district || row.tags?.includes('district:'+district)) && (!query || (row.name+' '+row.id).toLowerCase().includes(query.toLowerCase())));
  const pageSize=25, lastPage=Math.max(0,Math.ceil(filtered.length/pageSize)-1), current=Math.min(page,lastPage);
  const rows=data.filters ? filtered.slice(current*pageSize,(current+1)*pageSize) : filtered;
  const districts=[...new Set(data.rows.flatMap(r=>r.tags?.filter(t=>t.startsWith('district:')).map(t=>t.split(':')[1]) || []))].sort((a,b)=>Number(a)-Number(b));
  const max = Math.max(1, ...data.bars.map(b => b.count));
  return <section className="my-10 space-y-5" aria-labelledby="guide-evidence-heading">
    <h2 id="guide-evidence-heading" className="text-2xl font-semibold">What our school records show</h2>
    {data.summary.map(text => <p key={text} className="text-muted-foreground leading-relaxed">{text}</p>)}
    {data.bars.length > 0 && <figure className="rounded-xl border bg-muted/20 p-5 space-y-4">
      <figcaption className="font-medium">Recorded coverage—not admissions availability</figcaption>
      {data.bars.map(bar => <div key={bar.label}><div className="flex justify-between gap-4 text-sm mb-1"><span>{bar.label}</span><strong>{bar.count}</strong></div><div aria-hidden="true" className="h-3 rounded bg-primary/10"><div className="h-3 rounded bg-primary" style={{ width: `${bar.count / max * 100}%` }} /></div></div>)}
    </figure>}
    {data.filters && <div className="rounded-lg border bg-muted/20 p-4 space-y-4"><h3 className="font-semibold">Find your options</h3><div className="flex flex-wrap gap-4"><label className="text-sm space-y-1"><span className="block">Filter school records</span><select className="border rounded p-3 bg-background max-w-full" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="">All matching schools</option>{data.filters.map(f=><option value={f.value} key={f.value}>{f.label} ({data.rows.filter(r=>r.tags?.includes(f.value)).length})</option>)}</select></label>{districts.length>0 && <label className="text-sm space-y-1"><span className="block">District</span><select className="border rounded p-3 bg-background" value={district} onChange={e=>{setDistrict(e.target.value);setPage(0);}}><option value="">All districts</option>{districts.map(d=><option value={d} key={d}>District {d}</option>)}</select></label>}<label className="text-sm space-y-1"><span className="block">School name or identifier</span><input className="border rounded p-3 bg-background max-w-full" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} type="search"/></label></div><p role="status">{filtered.length} matching school records · showing {filtered.length?current*pageSize+1:0}–{Math.min((current+1)*pageSize,filtered.length)}</p></div>}
    <p className="text-xs text-muted-foreground md:hidden">Swipe the table horizontally to see every measure and data year.</p>
    <div className="overflow-x-auto rounded-lg border" role="region" aria-label="School evidence comparison" tabIndex={0}>
      <table className="w-full text-sm"><caption className="text-left p-4 font-medium">School records and data coverage</caption><thead className="bg-muted"><tr><th scope="col" className={cell}>School</th>{data.headers.map(h => <th key={h} scope="col" className={cell}>{h}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row" className={`${cell} min-w-48 font-medium`}>{row.href ? <a className="text-primary underline" href={row.href}>{row.name}</a> : row.name}<span className="block text-xs text-muted-foreground mt-1">{row.id}</span>{showRecordSources && row.evidenceUrl && <a className="block text-primary underline text-xs mt-2" href={row.evidenceUrl} target="_blank" rel="nofollow noopener noreferrer">Record source</a>}{row.website && <a className="block text-primary underline text-xs mt-2" href={row.website} target="_blank" rel="nofollow noopener noreferrer">School website: admissions, fees and aid</a>}</th>{row.cells.map((value, i) => <td key={i} className={cell}><span className={value === 'Listed' ? 'text-emerald-800 dark:text-emerald-300 font-medium' : ''}>{value}</span></td>)}</tr>)}</tbody></table>
    </div>
    {data.filters && <nav className="flex items-center gap-4" aria-label="School results pages"><button className="border rounded px-4 py-3 disabled:opacity-40" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current+1} of {lastPage+1}</span><button className="border rounded px-4 py-3 disabled:opacity-40" disabled={current===lastPage} onClick={()=>setPage(current+1)}>Next</button></nav>}
    {filtered.length===0 && <p>No recorded matches for these filters. Try another combination; missing data is not proof a program is unavailable.</p>}
    <p className="text-sm text-muted-foreground leading-relaxed">{data.note}</p>
    {data.surveys && Object.keys(data.surveys).length>0 && <section className="space-y-5"><h3 className="text-2xl font-semibold">What each school community reports</h3><p>Compare the same topic, instrument and year. These respondent scores are out of 100, not academic outcomes. Missing instruments stay missing; the 2026 student questionnaire is a new baseline.</p>{data.rows.map(row=><section key={row.id} className="space-y-4"><h4 className="text-xl font-semibold">{row.name}</h4>{data.surveys?.[row.id]?.length ? <SurveyResultsContent results={data.surveys[row.id]}/> : <p>No matched survey evidence is available for this comparison.</p>}</section>)}</section>}
  </section>;
}
export function ParentGuideContent({ guide, data, pending = false }: { guide: ParentGuide; data?: GuideData; pending?: boolean }) {
  const reviewed = guide.reviewedAt || GUIDE_REVIEWED;
  const reviewLabel = new Date(`${reviewed}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return <article className="max-w-5xl mx-auto">
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6"><a className="underline" href="/explore-schools">School guides</a> / Parent decision guide</nav>
    <header className="space-y-4 mb-8"><p className="text-sm text-primary font-semibold uppercase tracking-wide">NYC school research</p><h1 className="text-3xl md:text-4xl font-bold tracking-tight">{guide.title}</h1><p className="text-sm text-muted-foreground">Editorial review: <time dateTime={reviewed}>{reviewLabel}</time> · Dataset years are labeled separately below.</p><p className="text-lg leading-relaxed rounded-xl border border-primary/20 bg-primary/5 p-5">{guide.answer}</p><GuideAnchor link={guide.next}/></header>
    {guide.verified && (guide.shortlistMode ? <ShortlistExplorer key={guide.slug} guide={guide} data={data} pending={pending} /> : <VerifiedExamples evidence={guide.verified} />)}
    <section aria-labelledby="decision-comparison"><h2 id="decision-comparison" className="text-2xl font-semibold mb-4">What to compare before deciding</h2><div className="overflow-x-auto rounded-lg border" role="region" aria-label="Decision comparison" tabIndex={0}><table className="w-full text-sm"><caption className="sr-only">Decision criteria and their limitations</caption><thead className="bg-muted"><tr>{guide.columns.map(c => <th key={c} scope="col" className={cell}>{c}</th>)}</tr></thead><tbody>{guide.comparison.map((row, i) => <tr key={i}>{row.map((v, j) => j === 0 ? <th scope="row" key={j} className={`${cell} font-medium`}>{v}</th> : <td key={j} className={cell}>{v}</td>)}</tr>)}</tbody></table></div></section>
    {guide.examples && <section className="my-8 space-y-4" aria-labelledby="school-examples"><h2 id="school-examples" className="text-2xl font-semibold">School-source examples: questions to compare</h2><p>Illustrative examples, not a ranked or exhaustive list. School statements were checked on {reviewLabel}; directory survey years are separate.</p><div className="grid md:grid-cols-3 gap-4">{guide.examples.map(example => <section className="border rounded-lg p-5 space-y-3" key={example.name}><h3 className="text-xl font-semibold">{example.name}</h3><p>{example.detail}</p><p className="text-sm">{example.question}</p><GuideAnchor link={example.source}/></section>)}</div></section>}
    {data ? <GuideEvidence data={data} showRecordSources={guide.slug !== 'private-schools-brooklyn'} /> : guide.kind !== 'zones' && guide.kind !== 'editorial' && <p role="status" className="my-8 rounded-lg border p-5">{pending ? 'Loading the school comparison…' : 'School data is temporarily unavailable. The guidance below is still available; try reloading for the comparison.'}</p>}
    {guide.slug==='private-elementary-schools-nyc' && <PrivateCostComparison/>}
    {guide.kind==='continuity' && <ContinuityChecks/>}
    <div className="my-10 space-y-8">{guide.questions.map(q => <section key={q.title}><h2 className="text-2xl font-semibold mb-3">{q.title}</h2><p className="text-muted-foreground leading-relaxed">{q.text}</p></section>)}</div>
    <section className="border-t pt-6 space-y-3"><h2 className="text-xl font-semibold">Sources and data limits</h2><ul className="list-disc pl-5 space-y-2">{guide.sources.map(link => <li key={link.href}><GuideAnchor link={link} /></li>)}</ul>{guide.shortlistMode && <details><summary className="min-h-11 py-2 text-sm font-medium">Sources for the featured examples</summary><ul className="list-disc pl-5 space-y-2 text-sm">{guide.verified?.rows.map(row => <li key={row.name}>{row.name}<ul className="pl-3 space-y-1">{row.sources.map(link => <li key={link.href}><GuideAnchor link={link} /></li>)}</ul></li>)}</ul></details>}<p className="text-sm text-muted-foreground">Editorial review is not a new data release. Linked profiles identify available measures and years. Verify current admissions, program operation and seats with official sources.</p></section>
    <section className="my-8 rounded-xl bg-primary/5 border p-6"><h2 className="text-xl font-semibold mb-4">Your next step</h2><GuideAnchor link={guide.next} className="inline-block rounded-md bg-primary text-primary-foreground px-5 py-3 font-semibold" /></section>
    <nav aria-label="Related guides" className="border-t pt-6"><h2 className="text-xl font-semibold mb-4">Continue your research</h2><ul className="space-y-3">{guide.related.map(link => <li key={link.href}><GuideAnchor link={link} /></li>)}</ul></nav>
  </article>;
}
