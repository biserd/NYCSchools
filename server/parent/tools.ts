import {calculateAcademicScore,calculateOverallScore,getSchoolSlug,isHighSchool,type School} from '../../shared/schema';
import type {AgentPlan} from '../../shared/parent-agent';
import type {AssistantEnvironment} from './service';
import type {ResolvedAgentLocation} from './geography';

export type AgentSchool=School&{agent_safety_index:number|null;agent_metric:number|null};
export interface SchoolToolResult {tool:string;schools:AgentSchool[];scope:string;metric:string;limitations:string[]}

const boroughCode:Record<string,string>={Manhattan:'M',Bronx:'X',Brooklyn:'K',Queens:'Q','Staten Island':'R'};
const valid=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const languages=(school:School):string[]=>{const value=school.dual_language_languages;if(Array.isArray(value))return value;try{const parsed=JSON.parse(String(value||'[]'));return Array.isArray(parsed)?parsed:[];}catch{return [];}};
const gradeMatches=(school:School,grade:AgentPlan['gradeLevel'])=>{
  if(!grade||grade==='any')return true;
  if(grade==='2k')return !!school.has_2k;
  if(grade==='3k')return !!school.has_3k;
  if(grade==='prek')return !!school.has_prek;
  const band=school.grade_band.toLowerCase().replace(/\s+/g,'');
  if(grade==='high')return isHighSchool(school);
  if(grade==='middle')return /(?:6-8|5-8|k-8|pk-8|6-12|5-12)/.test(band);
  return /^(?:pk|prek|pre-k|k|[0-5])(?:-|$)/.test(band)&&!/^2-?k$|^3-?k$|^prek$|^pre-k$/.test(band);
};
const programMatches=(school:School,programs:AgentPlan['programs'])=>programs.every(program=>{
  if(program==='2k')return !!school.has_2k;
  if(program==='3k')return !!school.has_3k;
  if(program==='prek')return !!school.has_prek;
  if(program==='gifted')return !!school.has_gifted_talented;
  if(program==='dual_language')return !!school.has_dual_language;
  if(program==='spanish_dual_language')return !!school.has_dual_language&&languages(school).some(language=>/spanish/i.test(language));
  if(program==='mandarin_dual_language')return !!school.has_dual_language&&languages(school).some(language=>/mandarin|chinese/i.test(language));
  if(program==='specialized')return !!school.is_specialized_hs;
  return /screen/i.test(school.hs_admission_method||school.admission_method||'');
});
const metric=(school:School&{agent_safety_index:number|null},sort:AgentPlan['sort']):number|null=>{
  if(sort==='academics')return calculateAcademicScore(school);
  if(sort==='climate')return valid(school.climate_score)?school.climate_score:null;
  if(sort==='progress')return valid(school.progress_score)?school.progress_score:null;
  if(sort==='safety')return valid(school.agent_safety_index)?school.agent_safety_index:null;
  const score=calculateOverallScore(school);return score>=0?score:null;
};
const escapedLike=(value:string)=>`%${value.replace(/[\\%_]/g,'\\$&')}%`;

async function querySchools(userId:string,env:AssistantEnvironment,plan:AgentPlan,location:ResolvedAgentLocation|null,contextDbns:string[]):Promise<Array<School&{agent_safety_index:number|null}>> {
  const joins=[`LEFT JOIN school_safety_index asi ON asi.school_type='public' AND asi.school_key=s.dbn AND asi.radius_meters=805`];
  const where:string[]=[],bindings:unknown[]=[];
  if(location?.ntaCodes?.length){joins.push('JOIN school_neighborhoods sn ON sn.school_dbn=s.dbn');where.push(`sn.nta_code IN (${location.ntaCodes.map(()=>'?').join(',')})`);bindings.push(...location.ntaCodes);}
  else if(location?.zipCodes?.length){where.push(`s.zip_code IN (${location.zipCodes.map(()=>'?').join(',')})`);bindings.push(...location.zipCodes);}
  else if(location?.district){where.push('s.district=?');bindings.push(location.district);}
  else if(location?.borough){where.push('(s.borough=? OR substr(s.dbn,3,1)=?)');bindings.push(location.borough,boroughCode[location.borough]);}
  if(plan.action==='saved_schools') {where.push('s.dbn IN (SELECT school_dbn FROM favorites WHERE user_id=? UNION SELECT c.school_dbn FROM tuck_children c JOIN tuck_households h ON h.id=c.household_id WHERE h.owner_user_id=?)');bindings.push(userId,userId);}
  else if(plan.schoolQueries.length){where.push(`(${plan.schoolQueries.map(()=>`s.dbn=? OR s.name LIKE ? ESCAPE '\\'`).join(' OR ')})`);for(const query of plan.schoolQueries)bindings.push(query.toUpperCase(),escapedLike(query));}
  else if(plan.schoolQuery){where.push(`(s.dbn=? OR s.name LIKE ? ESCAPE '\\')`);bindings.push(plan.schoolQuery.toUpperCase(),escapedLike(plan.schoolQuery));}
  else if(contextDbns.length&&!location){where.push(`s.dbn IN (${contextDbns.map(()=>'?').join(',')})`);bindings.push(...contextDbns);}
  const sql=`SELECT s.*,asi.safety_index agent_safety_index FROM schools s ${joins.join(' ')}${where.length?' WHERE '+where.join(' AND '):''} ORDER BY s.name LIMIT 500`;
  return (await env.DB.prepare(sql).bind(...bindings).all<School&{agent_safety_index:number|null}>()).results;
}

export async function executeSchoolTool(userId:string,env:AssistantEnvironment,plan:AgentPlan,location:ResolvedAgentLocation|null,contextDbns:string[]):Promise<SchoolToolResult> {
  const identity=plan.action==='school_compare'?'compare_schools':plan.action==='school_detail'?'get_school_profile':plan.action==='saved_schools'?'get_saved_schools':'search_schools';
  let rows=(await querySchools(userId,env,plan,location,contextDbns)).filter(school=>gradeMatches(school,plan.gradeLevel)&&programMatches(school,plan.programs));
  const sort=plan.sort||((location||plan.action==='school_search')?'overall':'name');
  let ranked=rows.map(school=>({...school,agent_metric:sort==='name'?null:metric(school,sort)}));
  if(sort!=='name')ranked=ranked.filter(school=>school.agent_metric!=null).sort((a,b)=>(b.agent_metric!-a.agent_metric!)||a.name.localeCompare(b.name));
  else ranked.sort((a,b)=>a.name.localeCompare(b.name));
  const limit=plan.action==='school_compare'?4:plan.action==='school_detail'?1:5;
  ranked=ranked.slice(0,limit);
  const scope=location?.label||plan.schoolQuery||plan.schoolQueries.join(', ')||(plan.action==='saved_schools'?'saved schools':'NYC');
  const limitations:string[]=[];
  if(location?.kind==='neighborhood')limitations.push('Neighborhoods use official NYC Planning NTA boundaries when available; they are not school-zone boundaries.');
  if(sort!=='name')limitations.push(`Ordered by the site's ${sort} measure; this is not an official NYCPS ranking.`);
  if(!plan.gradeLevel||plan.gradeLevel==='any')limitations.push('Results can mix grade levels; specify elementary, middle or high school for a like-for-like shortlist.');
  return {tool:identity,schools:ranked,scope,metric:sort,limitations};
}

export function schoolToolSources(env:AssistantEnvironment,result:SchoolToolResult){return result.schools.map(s=>({name:s.name,url:`${env.APP_URL}/school/${getSchoolSlug(s)}`}));}
