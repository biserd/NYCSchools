import {z} from 'zod';

export const agentLocationKind=z.enum(['neighborhood','district','borough','zip']);
export const agentGradeLevel=z.enum(['2k','3k','prek','elementary','middle','high','any']);
export const agentSort=z.enum(['overall','academics','climate','progress','safety','name']);
export const agentProgram=z.enum(['2k','3k','prek','gifted','dual_language','spanish_dual_language','mandarin_dual_language','specialized','screened']);
export const agentAction=z.enum(['conversation','event','events','school_search','school_detail','school_compare','saved_schools','clarify']);

export const agentPlanSchema=z.object({
  action:agentAction,
  schoolQuery:z.string().max(120).nullable(),
  schoolQueries:z.array(z.string().max(120)).max(4),
  location:z.object({kind:agentLocationKind,value:z.string().max(100)}).nullable(),
  gradeLevel:agentGradeLevel.nullable(),
  programs:z.array(agentProgram).max(6),
  sort:agentSort.nullable(),
  title:z.string().max(160).nullable(),
  date:z.string().nullable(), reminderDate:z.string().nullable(), reminderTime:z.string().nullable(),
  clarification:z.string().max(300).nullable(),
}).strict();
export type AgentPlan=z.infer<typeof agentPlanSchema>;
export type AgentLocation=z.infer<typeof agentPlanSchema>['location'];

export interface ParentAgentContext {
  lastAction:string; locationKind:string|null; locationValue:string|null; locationLabel:string|null;
  gradeLevel:string|null; programs:string[]; resultDbns:string[]; expiresAt:number; updatedAt:number;
}

export interface ParentAgentRunRow {
  id:string; createdAt:number; model:string; action:string; tool:string; outcome:string; durationMs:number;
  locationKind:string|null; locationLabel:string|null; gradeLevel:string|null; resultCount:number; usedContext:boolean;
}

export const PARENT_AGENT_CONTEXT_TTL_MS=60*60*1000;
export const PARENT_AGENT_FAST_MODEL='@cf/zai-org/glm-4.7-flash' as const;
export const PARENT_AGENT_COMPLEX_MODEL='@cf/openai/gpt-oss-120b' as const;
