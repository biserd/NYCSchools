import {resolveNeighborhoodLanding} from '../../shared/seo-landings';
import type {AgentLocation} from '../../shared/parent-agent';
import type {AssistantEnvironment} from './service';

export interface ResolvedAgentLocation {
  kind:'neighborhood'|'district'|'borough'|'zip'; value:string; label:string;
  ntaCodes?:string[]; zipCodes?:string[]; district?:number; borough?:string;
}

export function normalizeNeighborhoodAlias(value:string):string {
  return value.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

const BOROUGHS:Record<string,string>={manhattan:'Manhattan',brooklyn:'Brooklyn',queens:'Queens',bronx:'Bronx','the bronx':'Bronx','staten island':'Staten Island'};

async function databaseNeighborhood(env:AssistantEnvironment,text:string):Promise<ResolvedAgentLocation|null> {
  const normalized=` ${normalizeNeighborhoodAlias(text)} `;
  const matches=await env.DB.prepare(`SELECT a.alias,n.nta_code,n.name,n.borough
    FROM nyc_neighborhood_aliases a JOIN nyc_neighborhoods n ON n.nta_code=a.nta_code
    WHERE instr(?, ' '||a.alias||' ')>0 ORDER BY length(a.alias) DESC,n.name LIMIT 40`).bind(normalized).all<{alias:string;nta_code:string;name:string;borough:string}>();
  if(!matches.results.length)return null;
  const alias=matches.results[0].alias,rows=matches.results.filter(row=>row.alias===alias);
  const names=[...new Set(rows.map(row=>row.name))];
  return {kind:'neighborhood',value:alias,label:names.length===1?names[0]:alias.replace(/\b\w/g,c=>c.toUpperCase()),ntaCodes:rows.map(row=>row.nta_code)};
}

export async function resolveAgentLocation(env:AssistantEnvironment,message:string,planned:AgentLocation):Promise<ResolvedAgentLocation|null> {
  const source=`${planned?.value||''} ${message}`;
  const district=/\bdistrict\s*(3[0-2]|[12]\d|[1-9])\b/i.exec(source);
  if(planned?.kind==='district'||district){const value=Number(planned?.kind==='district'?planned.value:district![1]);if(value>=1&&value<=32)return {kind:'district',value:String(value),label:`District ${value}`,district:value};}
  const zip=/\b(10|11)\d{3}\b/.exec(source);
  if(planned?.kind==='zip'||zip){const value=(planned?.kind==='zip'?planned.value:zip![0]).match(/\b(10|11)\d{3}\b/)?.[0];if(value)return {kind:'zip',value,label:`ZIP ${value}`,zipCodes:[value]};}
  const landing=resolveNeighborhoodLanding(source);
  if(landing)return {kind:'neighborhood',value:landing.slug,label:landing.name,zipCodes:landing.zipCodes};
  const database=await databaseNeighborhood(env,planned?.kind==='neighborhood'?planned.value:source);
  if(database)return database;
  const normalized=normalizeNeighborhoodAlias(planned?.kind==='borough'?planned.value:source);
  const borough=Object.entries(BOROUGHS).sort((a,b)=>b[0].length-a[0].length).find(([alias])=>` ${normalized} `.includes(` ${alias} `));
  return borough?{kind:'borough',value:borough[1],label:borough[1],borough:borough[1]}:null;
}
