import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { schoolDemographicsHistory } from '@shared/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Snapshot = typeof schoolDemographicsHistory.$inferSelect;
const pct = (n: number | null, bound?: string) => n == null ? (bound || 'Not reported / suppressed') : `${n}%`;

export function SchoolDemographicsHistory({ dbn }: { dbn: string }) {
  const metrics = { enrollment: 'Total enrolled students', ell_percent: 'ELL students (%)', iep_percent: 'Students with disabilities (%)', asian_percent: 'Asian / Pacific Islander (%)', black_percent: 'Black students (%)', hispanic_percent: 'Hispanic students (%)', white_percent: 'White students (%)', multi_racial_percent: 'Multi-racial students (%)' };
  const [metric, setMetric] = useState<keyof typeof metrics>('enrollment');
  const { data } = useQuery<Snapshot[]>({ queryKey: ['/api/schools', dbn, 'demographics-history'], enabled: !!dbn });
  const dated = data?.filter(r => /^20\d{2}-\d{2}$/.test(r.schoolYear)) ?? [];
  if (!dated.length) return null;
  const rows = dated.map(r => ({ year: r.schoolYear, ...r.data }));
  return <Card data-testid="card-demographics-history">
    <CardHeader><CardTitle>Enrollment &amp; demographic history</CardTitle>
      <p className="text-sm text-muted-foreground">NYCPS school years {dated[0].schoolYear} through {dated[dated.length - 1].schoolYear}. Total enrollment includes 3-K and pre-K where offered.</p>
    </CardHeader>
    <CardContent>
      <label className="text-sm block mb-3">Chart metric{' '}<select className="border rounded bg-background p-1 max-w-full" value={metric} onChange={e => setMetric(e.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="h-64" role="img" aria-label={`${metrics[metric]} by school year`}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, metric === 'enrollment' ? 'auto' : 100]} tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={v => metric === 'enrollment' ? String(v) : `${v}%`} />
          <Tooltip labelFormatter={year => `School year ${year}`} /><Legend />
          <Line dataKey={metric} name={metrics[metric]} stroke="#2563eb" strokeWidth={2} connectNulls={false} />
        </LineChart></ResponsiveContainer>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="table-demographics-history">
        <caption className="text-left text-xs text-muted-foreground py-2">Enrollment counts; ELL and students with disabilities as a percentage of enrollment. Economic Need Index uses a 0–100 scale; source bounds appear as reported.</caption>
        <thead><tr className="border-b"><th className="text-left p-2">School year</th><th className="text-right p-2">Total students</th><th className="text-right p-2">ELL %</th><th className="text-right p-2">Students with disabilities %</th><th className="text-right p-2">Economic Need Index (0–100)</th></tr></thead>
        <tbody>{dated.map(r => <tr key={r.schoolYear} className="border-b"><th className="text-left p-2 font-medium">{r.schoolYear}</th><td className="text-right p-2">{r.data.enrollment?.toLocaleString() ?? 'Not reported / suppressed'}</td><td className="text-right p-2">{pct(r.data.ell_percent, r.data.reported_bounds?.ell_percent)}</td><td className="text-right p-2">{pct(r.data.iep_percent, r.data.reported_bounds?.iep_percent)}</td><td className="text-right p-2">{r.data.economic_need_index ?? r.data.reported_bounds?.economic_need_index ?? 'Not reported / suppressed'}</td></tr>)}</tbody>
      </table></div>
      <p className="text-xs text-muted-foreground mt-3"><a className="underline" href={dated[dated.length - 1].sourceUrl} target="_blank" rel="noopener noreferrer">Source: NYCPS Demographic Snapshot 2021–22 to 2025–26</a>. Missing or suppressed values are not zero. Earlier undated profile values are retained separately and excluded from the dated chart.</p>
    </CardContent>
  </Card>;
}
