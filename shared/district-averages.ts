import type { School } from './schema';
import { calculateAcademicScore,calculateOverallScore,getAssessmentConfidence,isEarlyChildhoodOnly,isHighSchool,isPureHighSchool } from './school-utils';
import { latestAssessmentYear } from './current-ranking';

const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const rounded=(values:number[],digits=1)=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10**digits)/10**digits:null;
const metricFields={ellPercent:'ell_percent',iepPercent:'iep_percent',asianPercent:'asian_percent',blackPercent:'black_percent',hispanicPercent:'hispanic_percent',whitePercent:'white_percent',multiRacialPercent:'multi_racial_percent',economicNeedIndex:'economic_need_index'} as const;
const legacyFields={studentSafety:'student_safety',studentTeacherTrust:'student_teacher_trust',studentEngagement:'student_engagement',teacherQuality:'teacher_quality',teacherCollaboration:'teacher_collaboration',teacherLeadership:'teacher_leadership',guardianSatisfaction:'guardian_satisfaction',guardianCommunication:'guardian_communication',guardianSchoolTrust:'guardian_school_trust'} as const;

function snapshot(input:School[]) {
  const canonical=[...new Map(input.map(s=>[s.dbn,s])).values()].filter(s=>!isEarlyChildhoodOnly(s));
  const assessmentYear=latestAssessmentYear(canonical);
  const demographicsYear=canonical.map(s=>s.demographics_year).filter((v):v is string=>!!v&&/^20\d{2}-\d{2}$/.test(v)).sort().at(-1) ?? null;
  return {canonical,assessmentYear,demographicsYear};
}
export function buildDistrictAverages(input:School[],district:number,context=snapshot(input)) {
  const {canonical,assessmentYear,demographicsYear}=context;
  const schools=canonical.filter(s=>district===0||s.district===district);
  const assessments=schools.filter(s=>!isPureHighSchool(s)&&assessmentYear!=null&&s.assessment_year===assessmentYear&&valid(s.ela_proficiency)&&valid(s.math_proficiency)&&getAssessmentConfidence(s)!=='low');
  const grade38=assessments.filter(s=>!isHighSchool(s));
  const rated=grade38.map(calculateOverallScore).filter(v=>v>=0);
  const hs=schools.filter(isHighSchool).map(calculateOverallScore).filter(v=>v>=0);
  const demographics=schools.filter(s=>demographicsYear!=null&&s.demographics_year===demographicsYear);
  const read=(rows:School[],field:keyof School)=>rows.map(s=>s[field]).filter(valid);
  const mean=(rows:School[],field:keyof School)=>rounded(read(rows,field));
  const demographicsMetrics=Object.fromEntries(Object.entries(metricFields).map(([key,field])=>[key,mean(demographics,field)])) as Record<keyof typeof metricFields,number|null>;
  const legacyMetrics=Object.fromEntries(Object.entries(legacyFields).map(([key,field])=>[key,mean(schools,field)])) as Record<keyof typeof legacyFields,number|null>;
  const enrollment=demographics.map(s=>s.enrollment).filter((v):v is number=>v!=null&&Number.isFinite(v)&&v>=0);
  const ratios=schools.map(s=>s.student_teacher_ratio).filter((v):v is number=>v!=null&&Number.isFinite(v)&&v>0);
  return {
    district,schoolCount:schools.length,assessmentYear,assessmentTestYear:assessmentYear?Number(assessmentYear.slice(0,4))+1:null,demographicsYear,
    assessmentSchoolCount:assessments.length,ratedSchoolCount:rated.length,demographicsSchoolCount:demographics.length,
    overallScore:rounded(rated),academicsScore:rounded(assessments.map(s=>calculateAcademicScore(s)!).filter(valid)),
    elaProficiency:mean(assessments,'ela_proficiency'),mathProficiency:mean(assessments,'math_proficiency'),
    climateScore:mean(grade38,'climate_score'),progressScore:mean(grade38,'progress_score'),
    studentTeacherRatio:rounded(ratios),enrollment:rounded(enrollment,0),...demographicsMetrics,...legacyMetrics,
    highSchoolOverallScore:rounded(hs),highSchoolRatedCount:hs.length,
    metricCounts:{elaProficiency:assessments.length,mathProficiency:assessments.length,overallScore:rated.length,
      academicsScore:assessments.length,climateScore:read(grade38,'climate_score').length,progressScore:read(grade38,'progress_score').length,
      enrollment:enrollment.length,studentTeacherRatio:ratios.length,
      ...Object.fromEntries(Object.entries(metricFields).map(([key,field])=>[key,read(demographics,field).length]))},
    methodology:'Unweighted mean across schools with reported values, not a student-weighted district proficiency rate. ELA/math use complete subject pairs in the latest citywide assessment year, excluding low-confidence results. Overall averages actual eligible school ratings; high schools use a separate rating cohort. No missing-score defaults.',
    componentYears:{elaMath:assessmentYear,demographicsEnrollment:demographicsYear,climateProgress:'Legacy profile components; separate from the 2026 survey instruments',studentTeacherRatio:'Reporting year not recorded',highSchoolRating:'Graduation/readiness/progress component years vary; not a 2026 Regents rating'},
  };
}
export type DistrictAverages=ReturnType<typeof buildDistrictAverages>;

export function buildAllDistrictAverages(input:School[]):Map<number,DistrictAverages> {
  const context=snapshot(input);
  return new Map([...new Set(context.canonical.map(s=>s.district))].map(d=>[d,buildDistrictAverages(input,d,context)]));
}

export function districtAveragesForSchool(average:DistrictAverages|undefined,school:School|undefined):DistrictAverages|undefined {
  if(!average||!school)return average;
  const sameAssessment=school.assessment_year!=null&&school.assessment_year===average.assessmentYear;
  const sameDemographics=school.demographics_year!=null&&school.demographics_year===average.demographicsYear;
  const highSchool=isHighSchool(school);
  const result={...average,
    overallScore:highSchool?average.highSchoolOverallScore:sameAssessment?average.overallScore:null,
    academicsScore:!highSchool&&sameAssessment?average.academicsScore:null,
    elaProficiency:sameAssessment?average.elaProficiency:null,mathProficiency:sameAssessment?average.mathProficiency:null,
    climateScore:!highSchool&&sameAssessment?average.climateScore:null,progressScore:!highSchool&&sameAssessment?average.progressScore:null,
  };
  if(!sameDemographics){result.enrollment=null;for(const key of Object.keys(metricFields) as (keyof typeof metricFields)[])result[key]=null;}
  return result;
}
