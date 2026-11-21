import React from 'react';
import { Crown,Loader2,Lock } from 'lucide-react';

type UpgradeAction={ onClick:()=>void; pending?:boolean; href?:never } |
  { href:string; onClick?:never; pending?:never };
type UpgradeProps=UpgradeAction & {testId?:string};

export function SchoolUpgradeButton({onClick,href,pending,testId}:UpgradeProps) {
  const className='inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
  const content=<>{pending
    ? <Loader2 aria-hidden="true" className="size-4 animate-spin"/>
    : <Crown aria-hidden="true" className="size-4"/>}
    {pending?'Opening checkout…':'Upgrade to Premium'}</>;
  return href
    ? <a href={href} className={className} data-testid={testId} data-school-upgrade>{content}</a>
    : <button type="button" className={className} disabled={pending} onClick={onClick} data-testid={testId} data-school-upgrade>{content}</button>;
}

function PreviewGraphic({kind}:{kind:'cards'|'chart'|'rows'}){
  const tones=['bg-primary/30','bg-primary/20','bg-primary/25','bg-primary/35','bg-primary/25','bg-primary/30'];
  return <div aria-hidden="true" data-testid="school-premium-preview" className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden p-4 blur-[5px] sm:p-5">
    {kind==='cards' ? <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
      {tones.slice(0,4).map((tone,i)=><div key={i} className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className={`h-3 w-3/4 rounded-full ${tone}`}/>
        <div className="h-6 w-1/2 rounded bg-primary/20"/>
        <div className="h-2 w-2/3 rounded-full bg-primary/15"/>
      </div>)}
    </div> : kind==='chart' ? <div className="flex h-full items-end gap-4 rounded-lg border border-primary/15 px-4 pb-3 sm:gap-8">
      {tones.map((tone,i)=><div key={i} className={`flex-1 rounded-t-md ${tone}`} style={{height:[62,81,65,73,55,76][i]+'%'}}/>)}
    </div> : <div className="grid h-full grid-rows-3 gap-3">
      {tones.slice(0,3).map((tone,i)=><div key={i} className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4">
        <div className={`h-3 w-1/4 rounded-full ${tone}`}/>
        <div className="h-3 flex-1 rounded-full bg-primary/20"/>
        <div className="h-4 w-1/6 rounded bg-primary/15"/>
      </div>)}
    </div>}
  </div>;
}

export function SchoolPremiumGate({title,description,kind,className='',testId,action}:{
  title:string; description:string; kind:'cards'|'chart'|'rows'; className?:string; testId?:string; action:UpgradeProps;
}){
  return <div className={`relative isolate grid min-h-56 place-items-center overflow-hidden rounded-lg p-3 sm:p-4 ${className}`} data-testid={testId}>
    <PreviewGraphic kind={kind}/>
    <div className="w-full max-w-sm space-y-2 rounded-lg bg-background/45 px-4 py-3 text-center" data-testid="school-premium-overlay">
      <div className="mx-auto grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock aria-hidden="true" className="size-4"/>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-foreground/90">{description}</p>
      <SchoolUpgradeButton {...action}/>
    </div>
  </div>;
}
