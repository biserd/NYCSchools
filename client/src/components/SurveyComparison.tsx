import { useQueries } from '@tanstack/react-query';
import { SURVEY_INSTRUMENTS, surveyLabels, surveyCaution, type SurveyResult } from '@shared/surveys';
import { scoreBand } from '@shared/survey-presentation';
export function SurveyComparison({schools}: {schools:{dbn:string;name:string}[]}) {
  const queries = useQueries({queries:schools.map(s=>({queryKey:[`/api/surveys/school/${encodeURIComponent(s.dbn)}`],staleTime:3600000,retry:1}))});
  const results = queries.map(q=>q.data as SurveyResult[] | undefined);
  return <section className="border rounded-xl p-6 space-y-4" aria-labelledby="survey-comparison-title"><h2 id="survey-comparison-title" className="text-xl font-semibold">2026 school community feedback</h2>
    <p className="text-sm text-muted-foreground">Compare the same instrument and year. Scores are published topic values (0–100); no combined score or prior-year student trend is calculated.</p>
    {queries.some(q=>q.isLoading) && <p role="status">Loading survey comparison…</p>}
    {queries.some(q=>q.isError) && <p role="status">Some survey results could not be loaded. Missing columns are not zero scores.</p>}
    {SURVEY_INSTRUMENTS.filter(instrument=>results.some(rows=>rows?.some(r=>r.instrument===instrument))).map(instrument=>{
      const matches=results.map(rows=>rows?.filter(r=>r.instrument===instrument) ?? []);
      const keys=[...new Set(matches.flatMap(rows=>rows.flatMap(r=>r.metrics.map(m=>m.key))))];
      return <details key={instrument}><summary className="cursor-pointer min-h-11 font-medium">{surveyLabels[instrument]}</summary><p className="text-sm py-2">{surveyCaution(instrument)}</p><div className="overflow-x-auto"><table className="w-full text-sm"><caption>{surveyLabels[instrument]} · 2026</caption><thead><tr><th scope="col" className="p-2 text-left">Topic</th>{schools.map(s=><th scope="col" className="p-2" key={s.dbn}>{s.name}</th>)}</tr></thead><tbody>
        <tr><th scope="row" className="p-2 text-left">Participation</th>{matches.map((rows,i)=><td key={schools[i].dbn} className="p-2">{rows.length===1 ? `${rows[0].responseCount ?? 'Not reported'} responses; ${rows[0].responseRate==null?'rate not reported':Math.round(rows[0].responseRate*100)+'%'}` : rows.length>1?'Multiple source centers; see profile':'No matched result'}</td>)}</tr>
        {keys.map(key=><tr key={key} className="border-t"><th scope="row" className="p-2 text-left font-normal">{matches.flat().flatMap(r=>r.metrics).find(m=>m.key===key)?.label}</th>{matches.map((rows,i)=>{const value=rows.length===1?rows[0].metrics.find(m=>m.key===key)?.value??null:null,band=scoreBand(value);return <td key={schools[i].dbn} className={`p-3 text-center ${band.background} ${band.text}`}><span className="font-semibold">{rows.length===1?value??'Not reported':'Not comparable'}</span>{value!==null&&<span className="block text-xs mt-1">{band.label}</span>}</td>;})}</tr>)}
      </tbody></table></div></details>;
    })}
    {!queries.some(q=>q.isLoading||q.isError) && results.every(rows=>!rows?.length) && <p>No matched 2026 survey results for these schools.</p>}
    <a className="underline inline-flex min-h-11 items-center" href="/blog/survey-methodology">Survey sources and limitations</a>
  </section>;
}
