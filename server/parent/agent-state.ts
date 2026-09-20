import {PARENT_AGENT_CONTEXT_TTL_MS,type AgentPlan,type ParentAgentContext} from '../../shared/parent-agent';
import type {AssistantEnvironment} from './service';
import type {ResolvedAgentLocation} from './geography';

export async function loadAgentContext(userId:string,env:AssistantEnvironment,now=Date.now()):Promise<ParentAgentContext|null>{
  const row=await env.DB.prepare(`SELECT last_action,location_kind,location_value,location_label,grade_level,programs,result_dbns,expires_at,updated_at
    FROM parent_agent_contexts WHERE user_id=? AND expires_at>?`).bind(userId,now).first<{last_action:string;location_kind:string|null;location_value:string|null;location_label:string|null;grade_level:string|null;programs:string;result_dbns:string;expires_at:number;updated_at:number}>();
  if(!row)return null;
  const safeArray=(value:string)=>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.filter(item=>typeof item==='string').slice(0,20):[];}catch{return [];}};
  return {lastAction:row.last_action,locationKind:row.location_kind,locationValue:row.location_value,locationLabel:row.location_label,gradeLevel:row.grade_level,programs:safeArray(row.programs),resultDbns:safeArray(row.result_dbns),expiresAt:row.expires_at,updatedAt:row.updated_at};
}

export function shouldUseAgentContext(message:string):boolean {
  return /\b(those|them|these|the first|the second|which (?:one|ones)|what about|how about|of these|among them|closer|safest|best|elementary|middle|high school|2-?k|3-?k|pre-?k|explain (?:more|that)|tell me more|what else|how do i apply)\b/i.test(message);
}

export async function saveAgentContext(userId:string,env:AssistantEnvironment,plan:AgentPlan,location:ResolvedAgentLocation|null,resultDbns:string[],now=Date.now()) {
  await env.DB.prepare(`INSERT INTO parent_agent_contexts(user_id,last_action,location_kind,location_value,location_label,grade_level,programs,result_dbns,expires_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_action=excluded.last_action,location_kind=excluded.location_kind,location_value=excluded.location_value,
    location_label=excluded.location_label,grade_level=excluded.grade_level,programs=excluded.programs,result_dbns=excluded.result_dbns,expires_at=excluded.expires_at,updated_at=excluded.updated_at`)
    .bind(userId,plan.action,location?.kind||null,location?.value||null,location?.label||null,plan.gradeLevel,JSON.stringify(plan.programs),JSON.stringify(resultDbns.slice(0,20)),now+PARENT_AGENT_CONTEXT_TTL_MS,now).run();
}

export async function recordAgentRun(env:AssistantEnvironment,input:{userId:string;model:string;action:string;tool:string;outcome:string;durationMs:number;location:ResolvedAgentLocation|null;gradeLevel:string|null;resultCount:number;usedContext:boolean},now=Date.now()) {
  await env.DB.prepare(`INSERT INTO parent_agent_runs(id,user_id,created_at,model,action,tool,outcome,duration_ms,location_kind,location_label,grade_level,result_count,used_context)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),input.userId,now,input.model,input.action,input.tool,input.outcome,input.durationMs,input.location?.kind||null,input.location?.label||null,input.gradeLevel,input.resultCount,input.usedContext?1:0).run();
}

export async function parentAgentAdminOverview(env:AssistantEnvironment,now=Date.now()) {
  const since=now-7*86400000;
  const [summary,actions,tools,models,recent]=await Promise.all([
    env.DB.prepare(`SELECT count(*) total,sum(CASE WHEN outcome='ok' THEN 1 ELSE 0 END) successful,round(avg(duration_ms)) avg_duration_ms,sum(result_count) results FROM parent_agent_runs WHERE created_at>=?`).bind(since).first(),
    env.DB.prepare('SELECT action,count(*) count FROM parent_agent_runs WHERE created_at>=? GROUP BY action ORDER BY count DESC').bind(since).all(),
    env.DB.prepare('SELECT tool,count(*) count FROM parent_agent_runs WHERE created_at>=? GROUP BY tool ORDER BY count DESC').bind(since).all(),
    env.DB.prepare('SELECT model,count(*) count FROM parent_agent_runs WHERE created_at>=? GROUP BY model ORDER BY count DESC').bind(since).all(),
    env.DB.prepare(`SELECT created_at,model,action,tool,outcome,duration_ms,location_kind,location_label,grade_level,result_count,used_context
      FROM parent_agent_runs ORDER BY created_at DESC LIMIT 100`).all(),
  ]);
  return {now,windowDays:7,summary,actions:actions.results,tools:tools.results,models:models.results,recent:recent.results,privacy:'No message text, phone number, child information, email, or model response is stored in agent telemetry.'};
}
