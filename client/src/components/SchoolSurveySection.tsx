import { useQuery } from '@tanstack/react-query';
import { type SurveyResult } from '@shared/surveys';
import { SurveyResultsContent } from '@shared/SurveyResultsContent';

export function SchoolSurveySection({schoolKey, kind='school'}: {schoolKey:string; kind?:'school'|'center'}) {
  const query = useQuery<SurveyResult[]>({queryKey:[`/api/surveys/${kind}/${encodeURIComponent(schoolKey)}`], staleTime: 3600000, retry: 1});
  if (query.isSuccess && query.data.length === 0) return null;
  return <section id="school-community-survey" aria-labelledby="survey-heading" className="border rounded-xl p-6 space-y-4 min-h-[180px]">
    <h2 id="survey-heading" className="text-xl font-semibold">What the school community says</h2>
    <p className="text-sm text-muted-foreground">2026 NYC School Survey · Separate from academic ratings and neighborhood safety</p>
    {query.isLoading ? <p role="status">Loading survey feedback…</p> : query.isError ? <p role="status">Survey feedback is temporarily unavailable. <button className="underline min-h-11 px-2" onClick={()=>query.refetch()}>Try again</button></p> : <SurveyResultsContent results={query.data ?? []} />}
    <p className="text-sm"><a className="underline inline-flex min-h-11 items-center" href="/blog/nyc-school-survey-2026">Citywide findings</a> · <a className="underline inline-flex min-h-11 items-center" href="/blog/survey-methodology">Sources and methodology</a></p>
  </section>;
}
