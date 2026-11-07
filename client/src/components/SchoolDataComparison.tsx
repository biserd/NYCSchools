import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { School } from '@shared/schema';
import { schoolDisplayName } from '@shared/early-childhood';
import { regentsAtYear, DEMOGRAPHICS_SOURCE, REGENTS_SOURCE, type SchoolResearchData } from '@shared/school-research';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const metrics = { enrollment:'Total enrolled students', ell_percent:'ELL students (%)', iep_percent:'Students with disabilities (%)', asian_percent:'Asian / Pacific Islander (%)', black_percent:'Black students (%)', hispanic_percent:'Hispanic students (%)', white_percent:'White students (%)', multi_racial_percent:'Multi-racial students (%)', economic_need_index:'Economic Need Index (0–100)' };
type Metric = keyof typeof metrics;
const colors = ['#2563eb','#be185d','#059669','#7c3aed'];
const missing = 'Not reported / suppressed';
const valueText = (n: number | null | undefined, percent = false, bound?: string) => n == null ? (bound || missing) : percent ? `${n}%` : n.toLocaleString();
type Props = { schools: School[]; data: Record<string, SchoolResearchData | undefined> };

export function SchoolDataComparison({ schools }: { schools: School[] }) {
  const queries = useQueries({ queries:schools.map(s => ({ queryKey:['/api/schools',s.dbn,'research-data'], staleTime:600000 })) });
  const data = Object.fromEntries(schools.map((s,i) => [s.dbn,queries[i]?.data as SchoolResearchData | undefined]));
  return <>
    {queries.some(q => q.isPending) && <p role="status" className="text-sm text-muted-foreground">Loading dated enrollment and Regents comparisons…</p>}
    {queries.some(q => q.isError) && <p role="alert" className="text-sm text-destructive">Some school history could not be loaded. Reload to retry; unavailable data is not a zero result.</p>}
    <SchoolDataComparisonView schools={schools} data={data} />
  </>;
}

export function SchoolDataComparisonView({ schools, data }: Props) {
  const [metric,setMetric] = useState<Metric>('enrollment');
  const [chosenYear,setChosenYear] = useState('latest');
  const years = [...new Set(schools.flatMap(s => data[s.dbn]?.demographics_history.map(r=>r.school_year) ?? []))].sort();
  const year = years.includes(chosenYear) ? chosenYear : years.at(-1);
  const chart = years.map(y => ({ year:y, ...Object.fromEntries(schools.map(s => [s.dbn,data[s.dbn]?.demographics_history.find(r=>r.school_year===y)?.[metric] ?? null])) }));
  const percent = metric !== 'enrollment' && metric !== 'economic_need_index';
  return <>
    {years.length > 0 && <Card data-testid="comparison-enrollment-history">
      <CardHeader><CardTitle>Enrollment &amp; demographic history comparison</CardTitle>
        <p className="text-sm text-muted-foreground">Compare the same NYCPS school year. Counts include early childhood grades where offered; missing years stay empty. Changes can reflect different student populations.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <label>History metric{' '}<select className="border rounded bg-background p-1 max-w-full" value={metric} onChange={e=>setMetric(e.target.value as Metric)}>{Object.entries(metrics).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label>Demographic comparison school year{' '}<select className="border rounded bg-background p-1" value={year} onChange={e=>setChosenYear(e.target.value)}>{[...years].reverse().map(y=><option key={y}>{y}</option>)}</select></label>
        </div>
        <div className="h-64" role="img" aria-label={`${metrics[metric]} history comparison by school year`}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{top:10,right:20,bottom:10,left:5}}>
            <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year" tick={{fontSize:11}}/>
            <YAxis domain={[0,metric==='enrollment'?'auto':100]} tick={{fontSize:11}} tickFormatter={v=>percent?`${v}%`:String(v)}/>
            <Tooltip labelFormatter={v=>`School year ${v}`} formatter={(v:number)=>valueText(v,percent)}/><Legend/>
            {schools.map((s,i)=><Line key={s.dbn} dataKey={s.dbn} name={schoolDisplayName(s)} stroke={colors[i%colors.length]} strokeWidth={2} connectNulls={false}/>)}
          </LineChart></ResponsiveContainer>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="table-dated-demographics-comparison">
          <caption className="text-left text-xs text-muted-foreground py-2">School year {year}. Percentages use total enrollment; Economic Need Index is a 0–100 index.</caption>
          <thead><tr className="border-b"><th className="p-2 text-left">Metric</th>{schools.map(s=><th key={s.dbn} className="p-2 text-right">{schoolDisplayName(s)}</th>)}</tr></thead>
          <tbody>{Object.entries(metrics).map(([key,label])=><tr key={key} className="border-b"><th className="p-2 text-left font-medium">{label}</th>{schools.map(s=>{
            const snapshot=data[s.dbn]?.demographics_history.find(r=>r.school_year===year);
            return <td key={s.dbn} className="p-2 text-right tabular-nums">{valueText(snapshot?.[key as Metric],key!=='enrollment'&&key!=='economic_need_index',snapshot?.reported_bounds?.[key])}</td>;
          })}</tr>)}</tbody>
        </table></div>
        <details><summary className="cursor-pointer text-sm underline">Exact history values: {metrics[metric]}</summary><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr><th className="text-left p-2">School year</th>{schools.map(s=><th key={s.dbn} className="text-right p-2">{schoolDisplayName(s)}</th>)}</tr></thead>
          <tbody>{years.map(y=><tr key={y} className="border-b"><th className="text-left p-2">{y}</th>{schools.map(s=>{
            const row=data[s.dbn]?.demographics_history.find(r=>r.school_year===y);
            return <td key={s.dbn} className="text-right p-2">{valueText(row?.[metric],percent,row?.reported_bounds?.[metric])}</td>;
          })}</tr>)}</tbody>
        </table></div></details>
        <p className="text-xs text-muted-foreground"><a href={DEMOGRAPHICS_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">NYCPS Demographic Snapshot</a>. Dated snapshots span {years[0]}–{years.at(-1)}. Undated legacy profile values are excluded. Suppression and published bounds are preserved.</p>
      </CardContent>
    </Card>}
    <RegentsComparison schools={schools} data={data}/>
  </>;
}

function RegentsComparison({schools,data}:Props) {
  const [chosenYear,setChosenYear] = useState('latest');
  const years=[...new Set(schools.flatMap(s=>data[s.dbn]?.regents.available_reporting_years ?? []))].sort((a,b)=>b-a);
  const year=years.includes(Number(chosenYear))?Number(chosenYear):years[0];
  if(year==null)return null;
  const exams=[...new Set(schools.flatMap(s=>regentsAtYear(data[s.dbn],year).map(r=>r.exam_name)))].sort();
  return <Card data-testid="comparison-regents-results">
    <CardHeader><CardTitle>Regents exam comparison</CardTitle><p className="text-sm text-muted-foreground">Compare the same exam and NYCPS reporting year. Pass rate means scoring 65+; scoring 80+ is a separate threshold, not official CUNY readiness. Different curricula remain separate.</p></CardHeader>
    <CardContent className="space-y-4">
      <label className="text-sm">Regents reporting year{' '}<select className="border rounded bg-background p-1" value={year} onChange={e=>setChosenYear(e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
      <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="table-regents-comparison">
        <caption className="text-left text-xs text-muted-foreground py-2">NYCPS reporting year {year}; exam-specific results. No overall pass rate is inferred.</caption>
        <thead><tr className="border-b"><th className="p-2 text-left">Regents exam</th>{schools.map(s=><th key={s.dbn} className="p-2 text-right">{schoolDisplayName(s)}</th>)}</tr></thead>
        <tbody>{exams.map(exam=><tr key={exam} className="border-b"><th className="p-2 text-left font-medium">{exam}</th>{schools.map(s=>{
          const row=regentsAtYear(data[s.dbn],year).find(r=>r.exam_name===exam);
          return <td key={s.dbn} className="p-2 text-right tabular-nums">{row?<div className="space-y-1"><div>Pass (65+): {valueText(row.pass_rate,true)}</div><div>Scoring 80+: {valueText(row.scoring_80_plus_percent,true)}</div><div className="text-xs text-muted-foreground">Tested: {valueText(row.tested_count)} · Mean score: {valueText(row.mean_score)}</div></div>:<span className="text-muted-foreground">No published result for {year}</span>}</td>;
        })}</tr>)}</tbody>
      </table></div>
      <p className="text-xs text-muted-foreground"><a href={REGENTS_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">Source: NYCPS Regents results</a>. Missing or suppressed values are not zero. Earlier results are available in the reporting-year selector; a missing current-year result never uses an older year.</p>
    </CardContent>
  </Card>;
}
