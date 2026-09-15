import React from 'react';
import { surveyLabels, surveyCaution, type SurveyResult } from './surveys';
import { scoreBand, surveyNarrative } from './survey-presentation';
import { fmt, topicFor } from './survey-analysis';
export function SurveyResultsContent({results}: {results:SurveyResult[]}) {
  return <>
    {results.map(result => {
      const priority = result.instrument.endsWith('family') ? ['Family Satisfaction','Outreach','Parent-Teacher'] : result.instrument.endsWith('student') ? ['Safety','Student-Teacher','Personal Attention'] : ['Instructional Leadership','Peer Collaboration','Early Childhood Instruction'];
      const reported=result.metrics.filter(m=>m.value!==null);
      const selected=priority.flatMap(prefix=>reported.filter(m=>m.label.startsWith(prefix)).slice(0,1));
      const highlights=[...selected,...reported.filter(m=>!selected.includes(m))].slice(0,3);
      const story=surveyNarrative(result);
      const small=result.responseCount!==null&&result.responseCount<10;
      return <div key={`${result.instrument}-${result.sourceId}`} className="border rounded-xl overflow-hidden">
        <div className="bg-muted/50 border-b px-5 py-4"><p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">{result.instrument.startsWith('b5')?'Birth-to-5 survey':'K–12 survey'} · {result.year}</p><h3 className="font-semibold text-lg">{surveyLabels[result.instrument]}</h3><p className="text-sm text-muted-foreground mt-1">{result.sourceName}</p></div>
        <div className="p-5 space-y-4">
        <p className="text-sm">{surveyCaution(result.instrument)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border p-3 text-sm"><p><span className="block text-xs text-muted-foreground">Responses</span><strong className="text-lg">{fmt(result.responseCount)}</strong></p><p><span className="block text-xs text-muted-foreground">Response rate</span><strong className="text-lg">{result.responseRate==null?'Not reported':`${Math.round(result.responseRate*100)}%`}</strong></p><p><span className="block text-xs text-muted-foreground">Published topics</span><strong className="text-lg">{reported.length} / {result.metrics.length}</strong></p></div>
        {small&&<p className="text-sm rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-3">Small response count: fewer than 10 respondents. Interpret cautiously; this is our participation warning, not an official suppression rule.</p>}
        {result.responseRate===null&&<p className="text-xs text-muted-foreground">The source does not report participation as a share of eligible respondents. A count alone cannot establish how representative the feedback is.</p>}
        <div className="border-l-4 border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-r-lg"><h4 className="font-semibold mb-2">{story.title}</h4><p className="text-sm leading-6">{story.text}</p></div>
        {!!highlights.length&&<><p className="text-xs text-muted-foreground">Published topic scores (0–100), not an overall school rating. Colors describe score bands, not official quality grades.</p>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">{highlights.map(m=>{const band=scoreBand(m.value),benchmark=result.year===2026?topicFor(result.instrument,m.label):undefined;return <div className={`${band.background} ${band.text} rounded-lg p-4`} key={m.key}><dt className="text-sm font-medium min-h-10">{m.label}</dt><dd className="text-3xl font-bold my-3">{m.value}<span className="text-sm font-normal"> / 100</span></dd><div className="h-2 rounded-sm bg-background/80" aria-hidden="true"><div className={`h-full rounded-sm ${band.bar}`} style={{width:`${m.value}%`}}/></div><p className="text-xs font-medium mt-3">{band.label}</p>{benchmark?.median!=null&&<p className="text-xs mt-3 leading-5">2026 reporting-record median: {fmt(benchmark.median)} · n={fmt(benchmark.n)}. Same instrument/topic; not a citywide respondent rate.</p>}</div>;})}</dl></>}
        <details><summary className="cursor-pointer min-h-11 flex items-center underline">All {result.metrics.length} topics and source details</summary>
          <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left py-2">{result.sourceName} · {result.year}</caption><thead><tr><th scope="col" className="text-left p-2">Topic</th><th scope="col" className="text-right p-2">Score</th><th scope="col" className="text-left p-2">Score band</th></tr></thead><tbody>{result.metrics.map(metric=><tr className="border-t" key={metric.key}><th scope="row" className="text-left font-normal p-2">{metric.label}</th><td className="text-right p-2">{metric.value ?? 'Not reported'}</td><td className={`p-2 text-xs ${scoreBand(metric.value).text}`}>{scoreBand(metric.value).label}</td></tr>)}</tbody></table></div>
          <p className="text-sm"><a className="underline inline-flex min-h-11 items-center" href={result.sourceUrl} rel="nofollow noopener noreferrer" target="_blank">Official data workbook ↗</a> · Source ID: {result.sourceId}</p>
          <p className="text-xs break-all">Imported: {String(result.importedAt).slice(0,10)} · SHA-256: {result.sourceHash}</p>
          <p className="text-xs mt-3"><a className="underline" href="/blog/survey-methodology">How medians, score bands and missing values are handled</a></p>
        </details>
        </div>
      </div>;
    })}
  </>;
}
