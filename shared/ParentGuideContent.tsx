import React, { useState } from 'react';
import { GUIDE_REVIEWED, type GuideLink, type ParentGuide } from './parent-guides';
import type { GuideData } from './parent-guide-data';
import { SurveyResultsContent } from './SurveyResultsContent';
import { PrivateCostComparison } from './PrivateCostComparison';
import { ContinuityChecks } from './ContinuityChecks';

export function GuideAnchor({ link, className = 'text-primary underline underline-offset-4' }: { link: GuideLink; className?: string }) {
  const external = /^https?:/.test(link.href);
  return <a className={className} href={link.href} {...(external ? { target: '_blank', rel: 'nofollow noopener noreferrer' } : {})}>{link.label}</a>;
}
const cell = 'px-4 py-3 text-left align-top border-b';
export function GuideEvidence({ data }: { data: GuideData }) {
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
    {data.filters && <div className="rounded-lg border bg-muted/20 p-4 space-y-4"><h3 className="font-semibold">Find your options</h3><div className="flex flex-wrap gap-4"><label className="text-sm space-y-1"><span className="block">Program combination or borough</span><select className="border rounded p-3 bg-background max-w-full" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="">All matching schools</option>{data.filters.map(f=><option value={f.value} key={f.value}>{f.label} ({data.rows.filter(r=>r.tags?.includes(f.value)).length})</option>)}</select></label>{districts.length>0 && <label className="text-sm space-y-1"><span className="block">District</span><select className="border rounded p-3 bg-background" value={district} onChange={e=>{setDistrict(e.target.value);setPage(0);}}><option value="">All districts</option>{districts.map(d=><option value={d} key={d}>District {d}</option>)}</select></label>}<label className="text-sm space-y-1"><span className="block">School name or identifier</span><input className="border rounded p-3 bg-background max-w-full" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} type="search"/></label></div><p role="status">{filtered.length} matching school records · showing {filtered.length?current*pageSize+1:0}–{Math.min((current+1)*pageSize,filtered.length)}</p></div>}
    <p className="text-xs text-muted-foreground md:hidden">Swipe the table horizontally to see every measure and data year.</p>
    <div className="overflow-x-auto rounded-lg border" role="region" aria-label="School evidence comparison" tabIndex={0}>
      <table className="w-full text-sm"><caption className="text-left p-4 font-medium">School records and data coverage</caption><thead className="bg-muted"><tr><th scope="col" className={cell}>School</th>{data.headers.map(h => <th key={h} scope="col" className={cell}>{h}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row" className={`${cell} min-w-48 font-medium`}>{row.href ? <a className="text-primary underline" href={row.href}>{row.name}</a> : row.name}<span className="block text-xs text-muted-foreground mt-1">{row.id}</span>{row.evidenceUrl && <a className="block text-primary underline text-xs mt-2" href={row.evidenceUrl} target="_blank" rel="nofollow noopener noreferrer">Record source</a>}{row.website && <a className="block text-primary underline text-xs mt-2" href={row.website} target="_blank" rel="nofollow noopener noreferrer">School website: admissions, fees and aid</a>}</th>{row.cells.map((value, i) => <td key={i} className={cell}><span className={value === 'Listed' ? 'text-emerald-800 dark:text-emerald-300 font-medium' : ''}>{value}</span></td>)}</tr>)}</tbody></table>
    </div>
    {data.filters && <nav className="flex items-center gap-4" aria-label="School results pages"><button className="border rounded px-4 py-3 disabled:opacity-40" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current+1} of {lastPage+1}</span><button className="border rounded px-4 py-3 disabled:opacity-40" disabled={current===lastPage} onClick={()=>setPage(current+1)}>Next</button></nav>}
    {filtered.length===0 && <p>No recorded matches for these filters. Try another combination; missing data is not proof a program is unavailable.</p>}
    <p className="text-sm text-muted-foreground leading-relaxed">{data.note}</p>
    {data.surveys && Object.keys(data.surveys).length>0 && <section className="space-y-5"><h3 className="text-2xl font-semibold">What each school community reports</h3><p>Compare the same topic, instrument and year. These respondent scores are out of 100, not academic outcomes. Missing instruments stay missing; the 2026 student questionnaire is a new baseline.</p>{data.rows.map(row=><section key={row.id} className="space-y-4"><h4 className="text-xl font-semibold">{row.name}</h4>{data.surveys?.[row.id]?.length ? <SurveyResultsContent results={data.surveys[row.id]}/> : <p>No matched survey evidence is available for this comparison.</p>}</section>)}</section>}
  </section>;
}
export function ParentGuideContent({ guide, data, pending = false }: { guide: ParentGuide; data?: GuideData; pending?: boolean }) {
  return <article className="max-w-5xl mx-auto">
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6"><a className="underline" href="/explore-schools">School guides</a> / Parent decision guide</nav>
    <header className="space-y-4 mb-8"><p className="text-sm text-primary font-semibold uppercase tracking-wide">NYC school research</p><h1 className="text-3xl md:text-4xl font-bold tracking-tight">{guide.title}</h1><p className="text-sm text-muted-foreground">Editorial review: <time dateTime={GUIDE_REVIEWED}>October 25, 2026</time> · Dataset years are labeled separately below.</p><p className="text-lg leading-relaxed rounded-xl border border-primary/20 bg-primary/5 p-5">{guide.answer}</p></header>
    <section aria-labelledby="decision-comparison"><h2 id="decision-comparison" className="text-2xl font-semibold mb-4">What to compare before deciding</h2><div className="overflow-x-auto rounded-lg border" role="region" aria-label="Decision comparison" tabIndex={0}><table className="w-full text-sm"><caption className="sr-only">Decision criteria and their limitations</caption><thead className="bg-muted"><tr>{guide.columns.map(c => <th key={c} scope="col" className={cell}>{c}</th>)}</tr></thead><tbody>{guide.comparison.map((row, i) => <tr key={i}>{row.map((v, j) => j === 0 ? <th scope="row" key={j} className={`${cell} font-medium`}>{v}</th> : <td key={j} className={cell}>{v}</td>)}</tr>)}</tbody></table></div></section>
    {data ? <GuideEvidence data={data} /> : guide.kind !== 'zones' && <p role="status" className="my-8 rounded-lg border p-5">{pending ? 'Loading the school comparison…' : 'School data is temporarily unavailable. The guidance below is still available; try reloading for the comparison.'}</p>}
    {guide.kind==='private' && <PrivateCostComparison/>}
    {guide.kind==='continuity' && <ContinuityChecks/>}
    <div className="my-10 space-y-8">{guide.questions.map(q => <section key={q.title}><h2 className="text-2xl font-semibold mb-3">{q.title}</h2><p className="text-muted-foreground leading-relaxed">{q.text}</p></section>)}</div>
    <section className="border-t pt-6 space-y-3"><h2 className="text-xl font-semibold">Sources and data limits</h2><ul className="list-disc pl-5 space-y-2">{guide.sources.map(link => <li key={link.href}><GuideAnchor link={link} /></li>)}</ul><p className="text-sm text-muted-foreground">Editorial review is not a new data release. Linked profiles identify available measures and years. Verify current admissions, program operation and seats with official sources.</p></section>
    <section className="my-8 rounded-xl bg-primary/5 border p-6"><h2 className="text-xl font-semibold mb-4">Your next step</h2><GuideAnchor link={guide.next} className="inline-block rounded-md bg-primary text-primary-foreground px-5 py-3 font-semibold" /></section>
    <nav aria-label="Related guides" className="border-t pt-6"><h2 className="text-xl font-semibold mb-4">Continue your research</h2><ul className="space-y-3">{guide.related.map(link => <li key={link.href}><GuideAnchor link={link} /></li>)}</ul></nav>
  </article>;
}
