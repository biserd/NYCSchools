import { z } from 'zod';
import { schoolDisplayName } from '../shared/early-childhood';
import { calculateOverallScore, getAssessmentConfidence, getSchoolSlug, isEarlyChildhoodOnly, isHighSchool, type School } from '../shared/schema';
import { SURVEY_SOURCE, surveyCaution, type SurveyResult } from '../shared/surveys';

// A public, read-only view of canonical schools. No client API key, copied
// database, or connector-specific rating formula is involved.
export const MUSE_RESEARCH_TOOLS = ['search_schools', 'get_school_details', 'compare_schools'] as const;

const dbnSchema = z.string().regex(/^\d{2}[A-Z0-9]{4}$/i, 'Use a six-character school identifier such as 02M545.').transform(value => value.toUpperCase());
const gradeSchema = z.enum(['2k', '3k', 'prek', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
export const museSearchSchema = z.object({
  query: z.string().trim().min(2).max(100).optional(),
  district: z.number().int().min(1).max(84).optional(),
  borough: z.enum(['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island']).optional(),
  grade_band: z.enum(['ES', 'MS', 'HS']).optional(),
  grade: gradeSchema.optional(),
  school_type: z.enum(['district', 'charter', 'early_childhood_provider']).optional(),
  has_gifted_talented: z.boolean().optional(),
  has_dual_language: z.boolean().optional(),
  has_2k: z.boolean().optional(),
  has_3k: z.boolean().optional(),
  has_prek: z.boolean().optional(),
  min_overall_score: z.number().int().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(20).default(10),
  offset: z.number().int().min(0).max(500).default(0),
}).strict();
export const museDetailSchema = z.object({ dbn: dbnSchema }).strict();
export const museCompareSchema = z.object({
  dbns: z.array(dbnSchema).min(2).max(4).refine(values => new Set(values).size === values.length, 'Choose distinct school identifiers.'),
}).strict();

const METHODOLOGY_URL = 'https://nycschoolsratings.com/methodology';
const ASSESSMENT_SOURCE_URL = 'https://infohub.nyced.org/reports/academics/test-results';
const GRADUATION_SOURCE_URL = 'https://infohub.nyced.org/reports/academics/graduation-results';
const SCHOOL_QUALITY_URL = 'https://infohub.nyced.org/reports/school-quality';
const SCHOOL_SEARCH_URL = 'https://schoolsearch.schools.nyc/';

export const MUSE_TOOL_DEFINITIONS: Record<(typeof MUSE_RESEARCH_TOOLS)[number], {name: string; description: string; inputSchema: Record<string, unknown>; annotations: Record<string, boolean>}> = {
  search_schools: {
    name: 'search_schools',
    description: 'Find canonical NYC school records by name/identifier, grade, borough, district, known school type, and recorded program flags. Unverified 2-K records are excluded from positive 2-K filters. Returns at most 20 results per page with match reasons, source years, and profile links. This is discovery, not admissions eligibility or a placement recommendation. Missing scores are not zero.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {
      query: {type:'string',minLength:2,maxLength:100,description:'School name or six-character DBN; search first when a name is ambiguous.'},
      district: {type:'integer',minimum:1,maximum:84},
      borough: {type:'string',enum:['Manhattan','Bronx','Brooklyn','Queens','Staten Island']},
      grade_band: {type:'string',enum:['ES','MS','HS']},
      grade: {type:'string',enum:['2k','3k','prek','K','1','2','3','4','5','6','7','8','9','10','11','12']},
      school_type: {type:'string',enum:['district','charter','early_childhood_provider'],description:'Conservative classification from the canonical record; unknown types are not silently included.'},
      has_2k: {type:'boolean'},has_3k:{type:'boolean'},has_prek:{type:'boolean'},has_gifted_talented:{type:'boolean'},has_dual_language:{type:'boolean'},
      min_overall_score:{type:'integer',minimum:0,maximum:100,description:'Independent NYC School Ratings score, not an official NYCPS metric.'},
      limit:{type:'integer',minimum:1,maximum:20},offset:{type:'integer',minimum:0,maximum:500},
    }},
    annotations: {readOnlyHint:true,openWorldHint:false,destructiveHint:false},
  },
  get_school_details: {
    name:'get_school_details',
    description:'Read one canonical school profile by DBN. Separates proprietary ratings, official academic metrics, family/student/teacher surveys, and center-wide early-childhood feedback. Returns explicit nulls, source links, reporting years, admissions caveats, and a canonical profile URL; never claims current seats or odds.',
    inputSchema:{type:'object',additionalProperties:false,properties:{dbn:{type:'string',pattern:'^[0-9]{2}[A-Za-z0-9]{4}$',description:'Stable six-character school DBN from search results.'}},required:['dbn']},
    annotations:{readOnlyHint:true,openWorldHint:false,destructiveHint:false},
  },
  compare_schools: {
    name:'compare_schools',
    description:'Compare two to four distinct canonical school DBNs on identically defined available metrics, programs, and separate 2026 survey instruments. Missing values remain null and early-childhood providers are not assigned K–12 scores.',
    inputSchema:{type:'object',additionalProperties:false,properties:{dbns:{type:'array',items:{type:'string',pattern:'^[0-9]{2}[A-Za-z0-9]{4}$'},minItems:2,maxItems:4}},required:['dbns']},
    annotations:{readOnlyHint:true,openWorldHint:false,destructiveHint:false},
  },
};

function rating(school: School) {
  const raw = calculateOverallScore(school);
  const applicable = !isEarlyChildhoodOnly(school);
  const confidence = !isHighSchool(school) && applicable ? getAssessmentConfidence(school) : 'not_applicable';
  return {
    overall_score: applicable && raw >= 0 ? raw : null,
    status: !applicable ? 'not_applicable' : raw >= 0 ? 'rated' : confidence === 'low' ? 'withheld_limited_participation' : 'unavailable',
    confidence,
    definition: 'Independent NYC School Ratings comparison score; not an official NYCPS rating.',
    methodology_url: METHODOLOGY_URL,
  };
}

function schoolType(school: School): 'district' | 'charter' | 'early_childhood_provider' | 'unknown' {
  if (isEarlyChildhoodOnly(school)) return 'early_childhood_provider';
  // Charter DBNs use non-geographic District 84, while `school.district`
  // records the community district where the school is located.
  if (school.dbn.startsWith('84')) return 'charter';
  if (school.district >= 1 && school.district <= 32) return 'district';
  return 'unknown';
}

function schoolBorough(school: School): string | null {
  if (school.borough) return school.borough;
  // Geographic-district mapping deliberately excludes District 84. The DBN's
  // third character still provides the borough for charter schools.
  return ({M:'Manhattan',X:'Bronx',K:'Brooklyn',Q:'Queens',R:'Staten Island'} as Record<string,string>)[school.dbn.charAt(2).toUpperCase()] ?? null;
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/\./g,'').replace(/\b([pmij])\s+s\b/g,'$1s').replace(/\s+/g,' ').trim();
}

function gradeMatches(school: School, grade: z.infer<typeof gradeSchema>) {
  if (grade === '2k') return school.has_2k === true && school.early_childhood_source?.status !== 'needs_verification';
  if (grade === '3k') return school.has_3k === true;
  if (grade === 'prek') return school.has_prek === true;
  const band = school.grade_band.toUpperCase().replace(/\s+/g,'').replace('PRE-K','PK');
  const match = /^(PK|K|\d{1,2})-(PK|K|\d{1,2})$/.exec(band);
  if (!match) return band === grade.toUpperCase();
  const asNumber = (part:string) => part === 'PK' ? -1 : part === 'K' ? 0 : Number(part);
  const sought = asNumber(grade);
  return sought >= asNumber(match[1]) && sought <= asNumber(match[2]);
}

function bandMatches(school: School, band:'ES'|'MS'|'HS') {
  if (band === 'HS') return isHighSchool(school);
  return (band === 'ES' ? ['K','1','2','3','4','5'] : ['6','7','8']).some(grade => gradeMatches(school, grade as z.infer<typeof gradeSchema>));
}

function canonicalUrl(school: School, baseUrl:string) { return `${baseUrl}/school/${getSchoolSlug(school)}`; }
function scoreValue(value: number | null | undefined) { return typeof value === 'number' && value >= 0 && Number.isFinite(value) ? value : null; }

export function searchMuseSchools(schools: School[], raw: unknown, baseUrl:string) {
  const q = museSearchSchema.parse(raw);
  const query = q.query ? normalizedName(q.query) : null;
  const rows = schools.filter(s => {
    if (query && !normalizedName(s.name).includes(query) && !normalizedName(schoolDisplayName(s)).includes(query) && !s.dbn.toLowerCase().includes(query)) return false;
    if (q.district !== undefined && s.district !== q.district) return false;
    if (q.borough && schoolBorough(s) !== q.borough) return false;
    if (q.grade_band && !bandMatches(s,q.grade_band)) return false;
    if (q.grade && !gradeMatches(s,q.grade)) return false;
    if (q.school_type && schoolType(s) !== q.school_type) return false;
    for (const flag of ['has_2k','has_3k','has_prek','has_gifted_talented','has_dual_language'] as const) {
      if (q[flag] !== undefined && s[flag] !== q[flag]) return false;
    }
    if(q.has_2k === true && s.early_childhood_source?.status === 'needs_verification') return false;
    if (q.min_overall_score !== undefined && (rating(s).overall_score ?? -1) < q.min_overall_score) return false;
    return true;
  });
  rows.sort((a,b) => (rating(b).overall_score ?? -1) - (rating(a).overall_score ?? -1) || a.name.localeCompare(b.name) || a.dbn.localeCompare(b.dbn));
  const reasons = [query && 'name or identifier match', q.district && `district ${q.district}`, q.borough && `${q.borough} location`, q.grade && `grade ${q.grade}`, q.grade_band && `${q.grade_band} grades`, q.school_type && `${q.school_type} type`, ...(['has_2k','has_3k','has_prek','has_gifted_talented','has_dual_language'] as const).filter(flag => q[flag] === true).map(flag => `recorded ${flag.replace('has_','')} program`)].filter(Boolean);
  return {
    total_matches: rows.length, limit:q.limit, offset:q.offset,
    next_offset:q.offset + q.limit < rows.length ? q.offset + q.limit : null,
    schools: rows.slice(q.offset,q.offset+q.limit).map(s => ({
      dbn:s.dbn,name:schoolDisplayName(s),borough:schoolBorough(s),district:s.district,grade_band:s.grade_band,school_type:schoolType(s),
      programs:{has_2k:s.has_2k ?? null,has_3k:s.has_3k ?? null,has_prek:s.has_prek ?? null,has_gifted_talented:s.has_gifted_talented ?? null,has_dual_language:s.has_dual_language ?? null},
      rating:rating(s),assessment_year:s.assessment_year ?? null,assessment_source:s.assessment_source ?? null,
      program_source_url:s.early_childhood_source?.sourceUrl ?? null,program_verification:s.early_childhood_source?.status ?? null,
      match_reasons:reasons.length ? reasons : ['matches citywide school directory'],canonical_url:canonicalUrl(s,baseUrl),
    })),
    caveat:'This is a directory match, not a zone, admissions eligibility, seat availability, or placement claim.',
    sources:{methodology_url:METHODOLOGY_URL,assessment_source_url:ASSESSMENT_SOURCE_URL,official_school_search_url:SCHOOL_SEARCH_URL},
  };
}

function surveyView(results: SurveyResult[]) {
  return results.map(result => ({
    instrument:result.instrument,year:result.year,scope:result.instrument.startsWith('b5-')?'center_wide':'school',
    response_count:result.responseCount ?? null,response_rate:result.responseRate ?? null,
    metrics_total:result.metrics.length,metrics_returned:Math.min(5,result.metrics.length),
    metrics:result.metrics.slice(0,5).map(metric => ({key:metric.key,label:metric.label,value:metric.value ?? null,status:metric.status})),
    source_url:result.sourceUrl || SURVEY_SOURCE,note:surveyCaution(result.instrument),
  }));
}

export interface LatestGraduationContext { cohort_year:number; cohort_label:string | null; source:string | null }
export function museSchoolProfile(school:School, surveys:SurveyResult[], baseUrl:string, graduation:LatestGraduationContext | null = null) {
  const early = school.early_childhood_source;
  const isEarly = isEarlyChildhoodOnly(school);
  return {
    dbn:school.dbn,name:schoolDisplayName(school),borough:schoolBorough(school),district:school.district,grade_band:school.grade_band,school_type:schoolType(school),
    address:school.address,canonical_url:canonicalUrl(school,baseUrl),last_updated:school.last_updated?.toISOString() ?? null,
    rating:rating(school),
    academics:{assessment_year:school.assessment_year ?? null,assessment_source:school.assessment_source ?? null,
      ela_proficiency:isEarly?null:scoreValue(school.ela_proficiency),math_proficiency:isEarly?null:scoreValue(school.math_proficiency),science_proficiency:isEarly?null:scoreValue(school.science_proficiency),
      academics_score:isEarly?null:scoreValue(school.academics_score),climate_score:isEarly?null:scoreValue(school.climate_score),progress_score:isEarly?null:scoreValue(school.progress_score),source_url:ASSESSMENT_SOURCE_URL,
      high_school_outcomes:isHighSchool(school)?{graduation_rate_4yr:scoreValue(school.graduation_rate_4yr),college_readiness_rate:scoreValue(school.college_readiness_rate),latest_graduation_cohort_year:graduation?.cohort_year ?? null,latest_graduation_cohort_label:graduation?.cohort_label ?? null,source:graduation?.source ?? null,source_url:GRADUATION_SOURCE_URL,
        caveat:'Latest published cohort context is supplied separately; the canonical score fields do not retain an exact component-level reporting year.'}:null},
    programs:{has_2k:school.has_2k ?? null,has_3k:school.has_3k ?? null,has_prek:school.has_prek ?? null,has_gifted_talented:school.has_gifted_talented ?? null,has_dual_language:school.has_dual_language ?? null,
      early_childhood_verification:early?.status ?? null,source_cycle:early?.cycle ?? null,source_verified_at:early?.verifiedAt ?? null,source_url:early?.sourceUrl ?? null,
      source_cycle_note:school.has_2k ? 'The feed cycle is raw provenance, not a verified admissions year; confirm the current 2-K cycle with NYCPS.' : null},
    admissions:{reported_method:school.admission_method ?? school.hs_admission_method ?? null,source_url:SCHOOL_SEARCH_URL,note:'Historical or descriptive context only. Confirm current eligibility, seats, deadlines, and zones with NYC Public Schools; no admission odds or guaranteed placement are inferred.'},
    surveys:surveyView(surveys),
    source_links:{methodology:METHODOLOGY_URL,assessments:ASSESSMENT_SOURCE_URL,graduation:GRADUATION_SOURCE_URL,school_quality:SCHOOL_QUALITY_URL,official_school_search:SCHOOL_SEARCH_URL},
  };
}

export function museComparison(schools:School[], surveysByDbn:Record<string,SurveyResult[]>, baseUrl:string, graduationByDbn:Record<string,LatestGraduationContext | null> = {}) {
  return {
    metric_definitions:{overall_score:'Independent NYC School Ratings score, not an official NYCPS rating.',proficiency:'Reported percent proficient in the stated assessment year.',surveys:'Separate instruments, reported in 2026; missing values remain null. Birth-to-5 feedback is center-wide.'},
    schools:schools.map(school => {
      const profile=museSchoolProfile(school,surveysByDbn[school.dbn] ?? [],baseUrl,graduationByDbn[school.dbn] ?? null);
      return {dbn:profile.dbn,name:profile.name,grade_band:profile.grade_band,school_type:profile.school_type,canonical_url:profile.canonical_url,rating:profile.rating,academics:profile.academics,programs:profile.programs,surveys:profile.surveys};
    }),
    source_links:{methodology:METHODOLOGY_URL,assessments:ASSESSMENT_SOURCE_URL,graduation:GRADUATION_SOURCE_URL,surveys:SURVEY_SOURCE},
    caveat:'Compare like-for-like schools. A missing metric is not zero or evidence that a school is worse.',
  };
}
