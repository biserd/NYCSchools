import type { School, PrivateSchool, HsGraduation } from './schema';
import { getSchoolSlug, getPrivateSchoolSlug } from './school-utils';
import type { ParentGuide } from './parent-guides';

export type GuideRow = { id: string; name: string; href: string; cells: string[]; tags?: string[]; website?: string; evidenceUrl?: string };
export type GuideData = { summary: string[]; headers: string[]; rows: GuideRow[]; note: string; bars: Array<{ label: string; count: number }>; filters?: Array<{label:string;value:string}>; surveys?: Record<string, import('./surveys').SurveyResult[]> };
const unknown = 'Not recorded';
const pct = (n: number | null | undefined) => n != null && n >= 0 && n <= 100 ? `${n}%` : unknown;
const year = (s: School) => s.assessment_year || 'Year not recorded';
const program = (flag: boolean | null | undefined) => flag === true ? 'Listed' : 'Not confirmed';
export function includesKindergarten(grade: string | null | undefined): boolean {
  // PK, 2K and 3K alone must never be mistaken for kindergarten.
  const value = (grade ?? '').toUpperCase().replace(/[–—]/g, '-').replace(/\s/g, '');
  return /(^|[,/])K($|[-,/])/.test(value) || /^(PK|PRE-K|2K|3K)-([1-9]|1[0-2])$/.test(value);
}
export function hasPrivateElementary(s: Pick<PrivateSchool, 'lowestGrade' | 'highestGrade' | 'gradesOffered'>): boolean {
  const toGrade = (v: string | null) => v === 'PK' ? -1 : v === 'K' || v === 'KG' ? 0 : v && /^\d+$/.test(v) ? Number(v) : null;
  const low = toGrade(s.lowestGrade?.toUpperCase() ?? null);
  const high = toGrade(s.highestGrade?.toUpperCase() ?? null);
  if (low !== null && high !== null) return low <= 5 && high >= 0 && low <= high;
  const range = (s.gradesOffered ?? '').toUpperCase().replace(/[–—]/g, '-').replace(/\s/g, '');
  if (includesKindergarten(range)) return true;
  const match = range.match(/^(PK|[0-9]+)-([0-9]+)$/);
  return !!match && (match[1] === 'PK' || Number(match[1]) <= 5) && Number(match[2]) >= 1 && Number(match[2]) >= (match[1] === 'PK' ? 0 : Number(match[1]));
}
const canonical = <T,>(records: T[], id: (row: T) => string) => [...new Map(records.map(r => [id(r), r])).values()];

export function buildParentGuideData(guide: ParentGuide, input: School[] = [], privateInput: PrivateSchool[] = [], graduation: HsGraduation[] = []): GuideData {
  const schools = canonical(input, s => s.dbn);
  const base: GuideData = { summary: [], headers: [], rows: [], note: '', bars: [] };
  if (guide.kind === 'zones') return base;
  if (guide.kind === 'private') {
    const all = canonical(privateInput, s => s.ncesId);
    const matches = all.filter(hasPrivateElementary).sort((a, b) => a.name.localeCompare(b.name));
    const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    const bars = [...boroughs, 'Not recorded'].map(b => ({ label: b, count: matches.filter(s => (s.borough || 'Not recorded') === b).length }));
    const dated = matches.filter(s => s.dataSourceYear != null).length;
    const years = [...new Set(matches.map(s => s.dataSourceYear).filter((y): y is number => y != null))].sort((a, b) => b - a);
    const throughMiddle = matches.filter(s => s.highestGrade != null && /^\d+$/.test(s.highestGrade) && Number(s.highestGrade) >= 8).length;
    return {
      summary: [`${matches.length} of ${all.length} distinct private-school records explicitly include elementary grades (K–5). This is database coverage, not a count of open seats or a ranked list.`, `${throughMiddle} of these elementary-serving records also list grades through at least eighth grade. A longer grade span may reduce school changes, but does not guarantee progression between divisions.`, `${dated} of these ${matches.length} records have a source year${years.length ? `: ${years.map(y => `${y} (${matches.filter(s => s.dataSourceYear === y).length} schools)`).join('; ')}` : ''}. Different survey years should not be treated as one current-year snapshot.`],
      bars, filters: boroughs.map(b=>({label:b,value:b})), headers: ['Borough', 'Recorded grade span', 'Whole-school enrollment', 'NCES source year', 'Recorded affiliation / type', 'Students per FTE teacher', 'Current tuition / aid'],
      rows: matches.map(s => ({ id: s.ncesId, name: s.name, href: `/private-school/${getPrivateSchoolSlug(s)}`, tags:[s.borough || 'Not recorded'], website: safeWebsite(s.website), evidenceUrl:`https://nces.ed.gov/surveys/pss/privateschoolsearch/school_detail.asp?ID=${encodeURIComponent(s.ncesId)}`, cells: [s.borough || unknown, s.gradesOffered || `${s.lowestGrade || '?'}–${s.highestGrade || '?'}`, s.enrollment == null ? unknown : s.enrollment.toLocaleString('en-US'), s.dataSourceYear?.toString() || unknown, `${s.religiousAffiliation || 'Affiliation not recorded'} / ${s.schoolType || 'Type not recorded'}`, s.studentTeacherRatio == null || s.studentTeacherRatio < 0 ? unknown : String(s.studentTeacherRatio), 'Not independently verified — request a dated fee and aid schedule'] })),
      note: 'All matching canonical NCES IDs, alphabetically, not endorsements. Grade spans and affiliations are recorded import values, not independently confirmed current provision. Ungraded/unknown ranges are excluded. Source year dates the directory survey, not tuition. Whole-school students per full-time-equivalent teacher is not class size. We withhold unverified tuition amounts and do not treat missing aid/affiliation fields as “no.” Use each NCES source and school website to check identity, grades and current admissions.',
    };
  }
  if (guide.kind === 'continuity') {
    const matches = schools.filter(s => [s.has_2k, s.has_3k, s.has_prek, includesKindergarten(s.grade_band)].filter(Boolean).length >= 2)
      .sort((a, b) => a.name.localeCompare(b.name));
    const allFour = matches.filter(s => s.has_2k && s.has_3k && s.has_prek && includesKindergarten(s.grade_band)).length;
    return {
      summary: [`${matches.length} distinct canonical school records list at least two of 2-K, 3-K, pre-K and kindergarten. ${allFour} list all four. These overlaps describe recorded programs, not guaranteed transitions.`, 'A missing flag is not proof that a program is unavailable. We do not link separate records by shared address or similar name.'],
      bars: [
        { label: '2-K + 3-K', count: schools.filter(s => s.has_2k && s.has_3k).length },
        { label: '3-K + pre-K', count: schools.filter(s => s.has_3k && s.has_prek).length },
        { label: 'Pre-K + kindergarten', count: schools.filter(s => s.has_prek && includesKindergarten(s.grade_band)).length },
      ],
      filters: [{label:'2-K + 3-K',value:'2k-3k'},{label:'3-K + pre-K',value:'3k-prek'},{label:'Pre-K + kindergarten',value:'prek-k'},{label:'2-K + 3-K + pre-K',value:'2k-3k-prek'},{label:'3-K + pre-K + kindergarten',value:'3k-prek-k'},{label:'All four programs',value:'all-four'}],
      headers: ['District', '2-K', '3-K', 'Pre-K', 'Kindergarten', 'Early-years source cycle', 'Evidence status'],
      rows: matches.map(s => ({ id: s.dbn, name: s.name, href: `/school/${getSchoolSlug(s)}`, tags:[`district:${s.district}`,...(s.has_2k&&s.has_3k?['2k-3k']:[]),...(s.has_3k&&s.has_prek?['3k-prek']:[]),...(s.has_prek&&includesKindergarten(s.grade_band)?['prek-k']:[]),...(s.has_2k&&s.has_3k&&s.has_prek?['2k-3k-prek']:[]),...(s.has_3k&&s.has_prek&&includesKindergarten(s.grade_band)?['3k-prek-k']:[]),...(s.has_2k&&s.has_3k&&s.has_prek&&includesKindergarten(s.grade_band)?['all-four']:[])], evidenceUrl:safeWebsite(s.early_childhood_source?.sourceUrl), cells: [String(s.district), program(s.has_2k), program(s.has_3k), program(s.has_prek), program(includesKindergarten(s.grade_band)), s.early_childhood_source?.cycle || 'Cycle not recorded', `${s.early_childhood_source?.status || 'No verified early-years provenance'}${s.early_childhood_source?.verifiedAt ? ' · '+s.early_childhood_source.verifiedAt : ''}; K from grade span ${s.grade_band}`] })),
      note: 'All matching canonical records are available through the filters. Counts are distinct IDs, not programs or seats. Overlap groups can contain the same school and must not be added together. Cycle/status labels describe stored early-years provenance, not independent verification of every program flag. Kindergarten is derived only from explicit grades. No address/name-only joins or early-years academic ratings are used.',
    };
  }
  const requested = guide.dbns ?? [];
  const pair = requested.map(dbn => schools.find(s => s.dbn === dbn));
  const highSchool = guide.slug === 'townsend-harris-vs-stuyvesant';
  const summary = ['Records are matched by official DBN. These are descriptive comparisons, not admissions predictions or a new ranking.'];
  const commonCohort = highSchool ? graduation.filter(g => g.dbn === requested[0] && pct(g.grad_rate_4yr) !== unknown)
    .map(g => g.cohort_year).filter(y => graduation.some(g => g.dbn === requested[1] && g.cohort_year === y && pct(g.grad_rate_4yr) !== unknown)).sort((a, b) => b - a)[0] : undefined;
  const cohorts = requested.map(dbn => commonCohort === undefined ? undefined : graduation.find(g => g.dbn === dbn && g.cohort_year === commonCohort && pct(g.grad_rate_4yr) !== unknown));
  if (highSchool) {
    if (cohorts[0] && cohorts[1]) {
      const gap = Math.round(Math.abs(cohorts[0].grad_rate_4yr! - cohorts[1].grad_rate_4yr!) * 10) / 10;
      summary.push(`For the shared ${commonCohort} entry cohort, the reported four-year graduation rates differ by ${gap} percentage points. This compares the same cohort year; it does not isolate school effects or predict an individual student's outcome.`);
    } else summary.push('No shared cohort with a recorded four-year graduation rate is available for both schools. We do not mix cohort years to manufacture a comparison.');
  }
  if (!highSchool && pair[0] && pair[1]) {
    const [a, b] = pair as [School, School];
    if (a.assessment_year && a.assessment_year === b.assessment_year) {
      for (const [label, key] of [['ELA', 'ela_proficiency'], ['Math', 'math_proficiency']] as const) {
        if (pct(a[key]) !== unknown && pct(b[key]) !== unknown) {
          const delta = a[key]! - b[key]!;
          summary.push(`${a.assessment_year} ${label}: ${a.name} is ${Math.abs(delta)} percentage points ${delta >= 0 ? 'above' : 'below'} ${b.name}. This is a difference in reported proficiency, not a measure of added teaching value.`);
        }
      }
    } else summary.push('Assessment years are missing or differ, so no numerical proficiency gap is calculated.');
  }
  return {
    summary, bars: [], headers: highSchool ? ['District / address', 'Grade span', '4-year graduation', 'Cohort size', 'Entry cohort / source'] : ['District', 'Grade span', 'ELA proficiency', 'Math proficiency', 'Assessment year / source'],
    rows: pair.map((s, i) => s ? { id: s.dbn, name: s.name, href: `/school/${getSchoolSlug(s)}`, cells: highSchool ? [`District ${s.district} · ${s.address}`, s.grade_band, pct(cohorts[i]?.grad_rate_4yr), cohorts[i]?.total_cohort?.toLocaleString('en-US') ?? unknown, cohorts[i] ? `${cohorts[i]!.cohort_year} entry · ${cohorts[i]!.cohort_label || 'Class label not recorded'} · ${cohorts[i]!.data_source || 'Source not recorded'}` : 'No comparable cohort'] : [String(s.district), s.grade_band, pct(s.ela_proficiency), pct(s.math_proficiency), `${year(s)} · ${s.assessment_source || 'Source not recorded'}`] } : { id: requested[i], name: `${requested[i]} — record unavailable`, href: '', cells: [unknown, unknown, unknown, unknown, unknown] }),
    note: highSchool ? 'Graduation comparison uses the latest shared entry cohort with a recorded four-year rate, not the latest row from each school independently. Entry year is not graduation year. No grades 3–8 proficiency comparison is applied to these high schools. Open profiles for other individually dated measures.' : 'Proficiency is the reported share meeting the assessment standard, not a site rating. Check tested counts, participation and grade mix in the linked profiles before interpreting differences. Missing results remain missing rather than becoming zero.',
  };
}

export function safeWebsite(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ['http:','https:'].includes(url.protocol) && url.hostname.includes('.') ? url.href : undefined; } catch { return undefined; }
}

export function attachSurveyEvidence(data:GuideData, surveys:NonNullable<GuideData['surveys']>):GuideData {
  const [a,b]=data.rows;
  const first=a && surveys[a.id]?.filter(r=>r.instrument==='k12-family');
  const second=b && surveys[b.id]?.filter(r=>r.instrument==='k12-family');
  const summaries=[...data.summary];
  if(first?.length===1 && second?.length===1 && first[0].year===second[0].year) {
    const paired=first[0].metrics.filter(m=>m.value!=null && m.status==='reported').map(m=>({a:m,b:second[0].metrics.find(n=>n.key===m.key && n.label===m.label && n.value!=null && n.status==='reported')})).filter(p=>p.b);
    const selected=paired.find(p=>/Family Satisfaction/i.test(p.a.label)) || paired[0];
    if(selected) summaries.push(`${first[0].year} family survey, ${selected.a.label}: ${a.name} ${selected.a.value}/100; ${b.name} ${selected.b!.value}/100. These are scores from responding families, not a measure of all families or an admission outcome. Compare the response counts and rates below before interpreting the difference.`);
  }
  return {...data,summary:summaries,surveys};
}
