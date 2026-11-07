import React, {useEffect,useRef,useState} from 'react';
/** Portable Data chart renderer. The adjacent server-rendered table remains usable without JS. */
export function ScoreChart({id,title,rows,snapshot=false}:{id:string;title:string;rows:{school:string;previous?:number;current:number}[];snapshot?:boolean}) {
  const ref=useRef<HTMLDivElement>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const container=ref.current; if(!container)return;
    let active=true;
    const runtime='https://persistent.oaistatic.com/plugins/visualize/charts/data-analytics-plugin/1.2.1/charts/element.js';
    import(/* @vite-ignore */ runtime).then(({mountChart})=>{
      if(!active)return;
      mountChart(container,{id,title,height:Math.max(300,65*rows.length+60),summary:title+'; exact values and tested counts are in the following table.',
        spec:{type:'horizontalBar',y:'school',x:snapshot?'2026':['2025','2026'],xLabel:'Published rate (%)',xDomain:[0,100],showValues:true,showLegend:!snapshot,valueFormat:{style:'decimal',maximumFractionDigits:1},colors:{'2025':'#64748b','2026':'#2563eb'}},
        rows:rows.map(r=>({school:r.school,...(!snapshot?{'2025':r.previous}:{}),'2026':r.current}))});
    }).catch(()=>{if(active)setFailed(true);});
    return()=>{active=false;container.replaceChildren();};
  },[id,title,rows,snapshot]);
  return <figure className="border rounded-xl my-6 p-3 sm:p-5 bg-card" data-score-chart={id}>
    <figcaption className="font-semibold">{title}</figcaption><p className="text-sm text-muted-foreground my-2">{snapshot?'Reporting year 2026 only.':'2025 compared with 2026. Gray: 2025; blue: 2026.'} Horizontal scale: 0–100%. Exact values and tested counts appear below.</p>
    <div ref={ref} data-data-chart className="score-chart-renderer" style={{minHeight:Math.max(300,65*rows.length+60)}} aria-label={title}/>
    {failed&&<p role="status">The interactive chart could not load. All chart values remain available in the following table.</p>}
  </figure>;
}
