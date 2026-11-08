import React,{useEffect,useRef,useState} from 'react';
import {RELEASE_CHARTS,releaseSchoolExamples,releaseSubjectSamples} from './data-release-charts';

type ChartConfig=(typeof RELEASE_CHARTS)[keyof typeof RELEASE_CHARTS];
const link='text-primary underline underline-offset-4';
const cell='p-3 text-left align-top border-b';
const pp=(n:number)=>`${n>0?'+':''}${n.toFixed(1)} pp`;

function ReleaseChart({config,tableId,children}:{config:ChartConfig;tableId:string;children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const container=ref.current;if(!container)return;
    let active=true;
    const runtime='https://persistent.oaistatic.com/plugins/visualize/charts/data-analytics-plugin/1.2.1/charts/element.js';
    import(/* @vite-ignore */ runtime).then(({mountChart})=>{
      if(active)mountChart(container,config);
    }).catch(()=>{if(active)setFailed(true);});
    return()=>{active=false;container.replaceChildren();};
  },[config]);
  return <figure className="rounded-xl border bg-card p-4 sm:p-6 space-y-4" data-release-chart={config.id} aria-labelledby={`${config.id}-title`}>
    <figcaption id={`${config.id}-title`} className={failed?'text-xl font-bold':'sr-only'}>{config.title}</figcaption>
    <div ref={ref} data-data-chart className="score-chart-renderer" style={{minHeight:config.height}} aria-label={config.summary}/>
    {failed&&<p role="status">The interactive chart could not load. <a className={link} href={`#${tableId}`}>Read the same figures in the table below.</a></p>}
    <div className="text-sm leading-7 text-muted-foreground">{children}</div>
  </figure>;
}

export function DataReleaseOverviewCharts() {
  return <section className="space-y-6" aria-labelledby="release-visual-findings">
    <div className="space-y-3"><p className="text-sm uppercase tracking-wide font-semibold text-primary">The findings at a glance</p><h2 id="release-visual-findings" className="text-2xl sm:text-3xl font-bold">Different subjects, different patterns</h2><p className="leading-8">ELA declined at 720 of 843 matched schools, while US History Regents pass rates rose at 233 of 291. Each subject has its own eligible sample.</p></div>
    <ReleaseChart config={RELEASE_CHARTS.directions} tableId="release-sample-table">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-foreground mb-3" aria-label="Chart legend"><li><span aria-hidden="true" className="inline-block size-3 rounded-sm mr-2" style={{background:'#b45309'}}/>Declined</li><li><span aria-hidden="true" className="inline-block size-3 rounded-sm mr-2" style={{background:'#64748b'}}/>Unchanged</li><li><span aria-hidden="true" className="inline-block size-3 rounded-sm mr-2" style={{background:'#2563eb'}}/>Improved</li></ul>
      <p>Each bar totals 100% of its subject sample. Counts are normalized only to compare the mix of increases and declines; the sample sizes differ. ELA/math uses spring 2025 and spring 2026. Regents uses reporting years 2025 and 2026. Unchanged means no change at one-decimal precision.</p>
    </ReleaseChart>
    <ReleaseChart config={RELEASE_CHARTS.medians} tableId="release-sample-table"><p>Bars left of zero show declines; bars right of zero show increases. ELA/math measures proficiency. Regents measures pass rates at the 65+ threshold. These are medians of separate school-level samples, not official student-weighted citywide changes or the same children’s progress.</p></ReleaseChart>
    <div className="overflow-x-auto border rounded-xl" role="region" aria-label="Exact counts and median changes by subject" tabIndex={0} id="release-sample-table"><table className="w-full text-sm"><caption className="p-4 text-left font-semibold">Exact figures behind the charts: 2025 to 2026</caption><thead className="bg-muted"><tr>{['Subject and years','Eligible schools','Declined','Unchanged','Improved','Median change'].map(h=><th key={h} scope="col" className={cell}>{h}</th>)}</tr></thead><tbody>{releaseSubjectSamples.map(({label,years,report})=><tr key={label}><th scope="row" className={`${cell} min-w-44 font-medium`}>{label}<small className="block mt-1 text-muted-foreground">{years}</small></th><td className={cell}>{report.eligible}</td><td className={cell}>{report.decreased}</td><td className={cell}>{report.unchanged}</td><td className={cell}>{report.increased}</td><td className={`${cell} whitespace-nowrap`}>{pp(report.medianChange!)}</td></tr>)}</tbody></table></div>
    <p className="text-sm leading-7 text-muted-foreground">Source: independent analysis of <a className={link} href="https://infohub.nyced.org/reports/academics/test-results" target="_blank" rel="noopener noreferrer">public NYCPS test-results files</a>. ELA/math source snapshot: August 3, 2026. <a className={link} href="#media-resources">Download the comparison rows and methodology.</a></p>
  </section>;
}

export function DataReleaseSchoolChart() {
  return <div className="space-y-5">
    <ReleaseChart config={RELEASE_CHARTS.examples} tableId="release-example-table"><p>Gray shows 2025; blue shows 2026. These are the three gains described in this release, not a representative sample or a school-quality ranking. ELA/math percentages describe spring tests; the Regents percentage is a 65+ pass rate for the source reporting year. Different students may be tested each year.</p></ReleaseChart>
    <div className="overflow-x-auto border rounded-xl" role="region" aria-label="Featured school rates and tested counts in both years" tabIndex={0} id="release-example-table"><table className="w-full text-sm"><caption className="p-4 text-left font-semibold">Featured schools: exact rates, changes and tested counts</caption><thead className="bg-muted"><tr>{['School and measure','2025 rate','2026 rate','Change','Tested 2025','Tested 2026'].map(h=><th key={h} scope="col" className={cell}>{h}</th>)}</tr></thead><tbody>{releaseSchoolExamples.map(({subject,years,row})=><tr key={row.dbn}><th scope="row" className={`${cell} min-w-52 font-medium`}><a className={link} href={row.href}>{row.name}</a><small className="block mt-1">{subject}</small><small className="block text-muted-foreground">{years} 2025 to 2026 · {row.dbn}</small></th><td className={cell}>{row.previous.toFixed(1)}%</td><td className={cell}>{row.current.toFixed(1)}%</td><td className={`${cell} whitespace-nowrap`}>{pp(row.change)}</td><td className={cell}>{row.previousTested}</td><td className={cell}>{row.currentTested}</td></tr>)}</tbody></table></div>
  </div>;
}
