import React from 'react';
import { analysisFor, fmt, instrumentNames, pct, topicFor } from './survey-analysis';
import type { SurveyInstrument } from './surveys';

/** HTML bars stay visible in SSR, resize without JS and expose exact values in text. */
export function SurveyBars({title,subtitle,rows,max=100,unit=' / 100',tone='blue'}:{title:string;subtitle:string;rows:{label:string;value:number|null;note?:string;secondary?:number}[];max?:number;unit?:string;tone?:'blue'|'teal'|'violet'}) {
  const color={blue:'bg-blue-600',teal:'bg-teal-600',violet:'bg-violet-600'}[tone];
  return <figure className="not-prose my-8 rounded-xl border bg-card p-4 sm:p-6" aria-label={title}>
    <figcaption className="font-semibold text-lg">{title}</figcaption><p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
    <div className="flex justify-between text-xs text-muted-foreground mb-4" aria-hidden="true"><span>0</span><span>{fmt(max/2)}</span><span>{fmt(max)}{unit===' / 100'?' points':unit}</span></div>
    <div className="space-y-5">{rows.map(row=><div key={row.label}>
      <div className="flex justify-between items-start gap-4 text-sm mb-2"><span className="font-medium">{row.label}</span><span className="font-semibold tabular-nums shrink-0">{fmt(row.value)}{row.value!==null?unit:''}</span></div>
      <div className="relative h-3 bg-muted rounded-sm" aria-hidden="true">{row.secondary!==undefined&&<div className="absolute h-5 w-0.5 bg-foreground -top-1 z-10" style={{left:`${row.secondary/max*100}%`}}/>}{row.value!==null&&<div className={`h-full rounded-sm ${color}`} style={{width:`${Math.max(0,Math.min(100,row.value/max*100))}%`}}/>}</div>
      {row.note&&<p className="text-xs text-muted-foreground mt-2">{row.note}</p>}
    </div>)}</div>
  </figure>;
}
export function TopicEvidence({instrument,labels,title}:{instrument:SurveyInstrument;labels:string[];title:string}) {
  const release=analysisFor(instrument),topics=labels.map(l=>topicFor(instrument,l)).filter(t=>!!t);
  return <>
    <SurveyBars title={title} subtitle={`${instrumentNames[instrument]} · 2026 · Median published score across reporting records, not a percentage of NYC respondents.`} tone={instrument.startsWith('b5')?'teal':instrument.endsWith('student')?'violet':'blue'} rows={topics.map(t=>({label:t.label,value:t.median,note:`${fmt(t.n)} reporting records · middle half: ${fmt(t.q1)}–${fmt(t.q3)}`}))}/>
    <div className="not-prose overflow-x-auto rounded-xl border my-6"><table className="w-full text-sm text-left"><caption className="text-left p-4 font-medium">The exact numbers behind the chart · {instrumentNames[instrument]}</caption><thead className="bg-muted"><tr><th className="p-3">Topic</th><th className="p-3">Median</th><th className="p-3">Middle 50%*</th><th className="p-3">Reported / file records</th></tr></thead><tbody>{topics.map(t=><tr key={t.key} className="border-t"><th scope="row" className="p-3 font-normal">{t.label}</th><td className="p-3 tabular-nums">{fmt(t.median)}</td><td className="p-3 whitespace-nowrap">{fmt(t.q1)}–{fmt(t.q3)}</td><td className="p-3 whitespace-nowrap">{fmt(t.n)} / {fmt(release.rows)}</td></tr>)}</tbody></table></div>
    <p className="text-xs text-muted-foreground">*25th–75th percentiles of published record scores; this is spread, not a confidence interval. Missing values are excluded separately for each topic. Source: <a href={release.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">official {instrumentNames[instrument]} summary sheet ↗</a>. Equal weight per source record, including unmatched records.</p>
  </>;
}
export function ScoreDistribution({instrument,label}:{instrument:SurveyInstrument;label:string}) {
  const topic=topicFor(instrument,label)!;
  return <SurveyBars title={`Where the scores cluster: ${label}`} subtitle={`${instrumentNames[instrument]} · ${fmt(topic.n)} records with a published score. Bands are descriptive, not school-quality grades.`} unit="%" rows={topic.bins.map(b=>({label:`Score ${b.label}`,value:pct(b.count,topic.n),note:`${fmt(b.count)} of ${fmt(topic.n)} reporting records`}))}/>;
}
export function CoverageEvidence() {
  const instruments:SurveyInstrument[]=['k12-family','k12-teacher','k12-student','b5-family','b5-teacher'];
  return <><SurveyBars title="Five datasets, very different visibility" subtitle="Share of each official file's records with at least one published topic score. This measures data coverage—not satisfaction or response rate." unit="%" rows={instruments.map(i=>{const r=analysisFor(i);return{label:instrumentNames[i],value:pct(r.withScores,r.rows),note:`${fmt(r.withScores)} with scores · ${fmt(r.rows-r.withScores)} with no published topic scores`};})}/>
    <div className="not-prose overflow-x-auto border rounded-xl my-6"><table className="w-full text-sm text-left"><caption className="p-4 text-left font-semibold">All five imported datasets · 7,039 source records, not unique schools</caption><thead className="bg-muted"><tr><th className="p-3">Dataset</th><th className="p-3">File records</th><th className="p-3">With scores</th><th className="p-3">Under 10 responses</th></tr></thead><tbody>{instruments.map(i=>{const r=analysisFor(i);return <tr key={i} className="border-t"><th scope="row" className="p-3 font-medium">{instrumentNames[i]}</th><td className="p-3">{fmt(r.rows)}</td><td className="p-3">{fmt(r.withScores)}</td><td className="p-3">{fmt(r.belowTen)}</td></tr>;})}</tbody></table></div></>;
}
