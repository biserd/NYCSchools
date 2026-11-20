import React, { useId,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CITY_CAP_SOURCE,CITY_CLASS_SOURCE,CLASS_SIZE_ARTICLE,classAverage,classSizeDate,classSizeGrade,
  type CityClassSizeProfile,type ClassSizeBand,type ClassSizeCaps,type ClassSizeRow } from '@shared/city-class-size';

const bands=[['K5','Grade-level classes'],['MS','Middle school courses'],['HS','High school courses']] as const;
const count=new Intl.NumberFormat('en-US');
const number=(n:number)=>count.format(n);
const isGrade=(x:string)=>x==='K'||/^\d+$/.test(x);
const sortGrade=(x:string)=>x==='K'?0:isGrade(x)?Number(x):99;

function Cap({value}:{value:ClassSizeCaps}){
  return <p className="text-sm text-muted-foreground"><strong className="text-foreground">{number(value.meeting)} of {number(value.eligible)} reported classes met the cap.</strong>{' '}
    <a href={CITY_CAP_SOURCE} target="_blank" rel="nofollow noopener noreferrer" className="underline">NYCPS compliance report</a></p>;
}

function ProgramRow({row,data}:{row:ClassSizeRow;data:CityClassSizeProfile}){
  const avg=classAverage(row.students,row.classes);
  const district=classAverage(row.districtStudents,row.districtClasses);
  const prior=classAverage(row.previousStudents,row.previousClasses);
  return <li className="min-w-0 rounded-lg border bg-background p-3" data-testid="class-size-program">
    <p className="text-sm font-medium">{row.program}</p>
    <p className="mt-1"><strong className="text-lg tabular-nums">{avg}</strong> <span className="text-sm">students per class</span></p>
    <p className="text-xs text-muted-foreground">{number(row.classes)} {row.classes===1?'class':'classes'}</p>
    <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
      {row.minimum&&row.maximum&&<div><dt className="inline">Reported size range: </dt><dd className="inline tabular-nums text-foreground">{row.minimum===row.maximum?row.minimum:`${row.minimum} to ${row.maximum}`}</dd></div>}
      {district!==null&&data.district!==null&&<div><dt className="inline">District {data.district}: </dt><dd className="inline tabular-nums text-foreground">{district} per class</dd></div>}
      {prior!==null&&data.previousOn&&<div><dt className="inline">{classSizeDate(data.previousOn)}: </dt><dd className="inline tabular-nums text-foreground">{prior} per class</dd></div>}
    </dl>
  </li>;
}

export function CityClassSizeContent({data,districtView=false}:{data:CityClassSizeProfile;districtView?:boolean}){
  const id=useId();
  const available=bands.filter(([b])=>data.rows.some(row=>row.band===b));
  const [active,setActive]=useState<ClassSizeBand>(available[0]?.[0]??'K5');
  const band=available.some(([b])=>b===active)?active:available[0]?.[0];
  const [group,setGroup]=useState('');
  const currentRows=data.rows.filter(row=>row.band===band);
  const groups=[...new Set(currentRows.map(row=>band==='K5'?row.groupName:row.department))]
    .sort((a,b)=>band==='K5'?sortGrade(a)-sortGrade(b)||a.localeCompare(b):a.localeCompare(b));
  const selected=groups.includes(group)?group:groups[0];
  const displayed=currentRows.filter(row=>(band==='K5'?row.groupName:row.department)===selected);
  const courses=[...new Set(displayed.map(row=>row.groupName))];
  if(!available.length)return null;
  return <section id="class-sizes" className="scroll-mt-20 space-y-4 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby={id+'-heading'} data-testid="city-class-sizes">
    <div>
      <h2 id={id+'-heading'} className="text-xl font-semibold">{districtView?`District ${data.district} class sizes by grade`:'Class sizes'}</h2>
      <p className="text-sm text-muted-foreground">NYC Public Schools snapshot, {classSizeDate(data.observedOn)} ({data.releaseLabel} release). Class sizes can change during the year.</p>
    </div>
    {available.length>1&&<div role="group" aria-label="Class type" className="flex flex-wrap gap-2">
      {available.map(([key,label])=><button key={key} type="button" aria-pressed={band===key} aria-controls={id+'-details'}
        className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10"
        onClick={()=>{setActive(key);setGroup('');}}>{label}</button>)}
    </div>}
    <div className="space-y-1">
      <label htmlFor={id+'-filter'} className="block text-sm font-medium">{band==='K5'?'Grade or class group':'Department'}</label>
      <select id={id+'-filter'} className="max-w-full rounded-md border bg-background px-3 py-2" value={selected} onChange={e=>setGroup(e.currentTarget.value)}>
        {groups.map(key=><option key={key} value={key}>{band==='K5'?classSizeGrade(key):key}</option>)}
      </select>
    </div>
    <div id={id+'-details'} className="space-y-4">
      {courses.map(name=>{
        const courseScopes=band==='K5'?1:new Set(data.rows.filter(r=>r.band!=='K5'&&r.groupName===name).map(r=>r.band+'|'+r.department)).size;
        const cap=courseScopes===1?data.caps.find(c=>c.scope===(band==='K5'?'grade':'course')&&c.groupName===name):undefined;
        return <div className="space-y-2" key={name}>
          <h3 className="font-medium">{band==='K5'?classSizeGrade(name):name}</h3>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {displayed.filter(row=>row.groupName===name).map(row=><ProgramRow key={row.program} row={row} data={data}/>)}
          </ul>
          {cap&&<Cap value={cap}/>}
        </div>;
      })}
    </div>
    <p className="text-xs text-muted-foreground">{band==='K5'?'Official classrooms only; rotating subject classes are not included.':'Course sections are not enrollment by grade. The same student can appear in several courses.'} {!districtView&&'Cap counts cover only classes included in the compliance report. '}These figures are not seat availability or a pupil-to-teacher ratio.</p>
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><a href={CITY_CLASS_SOURCE} target="_blank" rel="nofollow noopener noreferrer" className="text-primary underline">NYCPS class-size reports</a>
      <a href={CLASS_SIZE_ARTICLE} className="text-primary underline">How to read class-size data</a></p>
  </section>;
}

export function CityClassSizes({dbn}:{dbn:string}){
  const {data}=useQuery<CityClassSizeProfile|null>({queryKey:['/api/schools',dbn,'class-sizes'],enabled:Boolean(dbn),retry:false,staleTime:5*60_000});
  return data?<CityClassSizeContent key={dbn} data={data}/>:null;
}

export function DistrictClassSizes({district}:{district:string}){
  const {data}=useQuery<CityClassSizeProfile|null>({queryKey:['/api/districts',district,'class-sizes'],
    enabled:/^(?:[1-9]|[12]\d|3[0-2])$/.test(district),retry:false,staleTime:5*60_000});
  return data?<CityClassSizeContent key={district} data={data} districtView/>:null;
}
