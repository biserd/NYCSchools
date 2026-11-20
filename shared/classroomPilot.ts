export const PILOT_SCHOOL = '02M158';
export const PILOT_SCHOOL_PATH = '/school/02m158-ps-158-bayard-taylor';
export const PILOT_DISTRICT_PATH = '/district/2';
export const PILOT_DRAFT_PATH = '/preview/does-falling-enrollment-mean-smaller-classes';
export const CLASSROOM_ARTICLE = {
  slug: 'does-falling-enrollment-mean-smaller-classes',
  title: 'Does falling enrollment mean smaller classes?',
  description: 'We compared District 2 kindergarten enrollment and classroom sizes across two Octobers. See what changed, what NYCPS counts and what to ask on a school tour.',
  author: 'NYC School Ratings Team', publishedAt: '2026-11-20', readTime: '8 min read', category: 'Data Analysis',
  tags: ['Kindergarten', 'Class Size', 'Enrollment', 'District 2', 'NYC Schools'],
};
export const CLASSROOM_ARTICLE_PATH = `/blog/${CLASSROOM_ARTICLE.slug}`;
export const PILOT_API = '/api/classroom-data-pilot';
export const CLASS_SIZE_SOURCE = 'https://infohub.nyced.org/reports/government-reports/class-size-reports';
export const REGISTER_SOURCE = 'https://infohub.nyced.org/docs/default-source/default-document-library/fy27---table-b---enrollment-projections.xlsx';
export const CAPS_SOURCE = 'https://infohub.nyced.org/docs/default-source/default-document-library/fy27---table-c---2026-27-class-size-compliance-by-school.xlsx';

export type RegisterCell = { count: number | null; status: 'reported' | 'missing' | 'suppressed' };
export type ProgramClassSize = { program: 'Gen Ed' | 'ICT'; students: number; classes: number };
export type CapCounts = { eligible: number; meeting: number };
export type PublishedClassSizes = ProgramClassSize & { size: number | null; label: string };
type MatchedExamplePeriod = { enrolled: number; students: number; classes: number };
export type MatchedExample = {
  dbn: string; name: string; programs: ProgramClassSize['program'][];
  before: MatchedExamplePeriod; after: MatchedExamplePeriod;
};
export type DistrictRow = {
  dbn: string; name: string; path: string | null;
  previousK: RegisterCell; currentK: RegisterCell; programs: ProgramClassSize[];
};
export type ReleasePoint = { id: string; observedOn: string; revision: number };
export type PilotData = {
  school: {
    previousTotal: RegisterCell; currentTotal: RegisterCell;
    previousK12: RegisterCell; currentK12: RegisterCell;
    previousK: RegisterCell; currentK: RegisterCell;
    grades: { grade: string; previous: RegisterCell; current: RegisterCell }[];
    programs: ProgramClassSize[]; cap: CapCounts | null; distribution: PublishedClassSizes[];
  };
  district: { rows: DistrictRow[]; students: number; classes: number };
  priorDistrict: { students: number; classes: number; schools: number };
  priorSchoolPrograms: ProgramClassSize[];
  sources: { previousRegister: string; currentRegister: string; priorClasses: string; currentClasses: string };
  summary: {
    beforeSchools: number; afterSchools: number; matchedSchools: number; addedSchools: number; removedSchools: number;
    beforeTotal: number; afterTotal: number; matchedBefore: number; matchedAfter: number;
  };
  matched: {
    schools: number; fallingEnrollment: number; smaller: number; larger: number; unchanged: number;
    matrix?: Record<'falling' | 'flat' | 'rising',Record<'smaller' | 'unchanged' | 'larger',number>>;
    examples?: MatchedExample[];
    points?: MatchedExample[];
  } | null;
};

export function latestObservationVersions<T extends ReleasePoint>(releases: readonly T[]): T[] {
  const latest = new Map<string,T>();
  for (const item of releases) {
    const existing = latest.get(item.observedOn);
    if (!existing || item.revision > existing.revision) latest.set(item.observedOn, item);
  }
  return [...latest.values()].sort((a, b) => a.observedOn.localeCompare(b.observedOn));
}

export function classTotals(rows: readonly ProgramClassSize[]) {
  const totals = rows.reduce((out, row) => ({ students: out.students + row.students, classes: out.classes + row.classes }), {students: 0, classes: 0});
  return { ...totals, average: totals.classes ? totals.students / totals.classes : null };
}

export function hasClassroomPilot(): boolean {
  return typeof document !== 'undefined' && document.querySelector('meta[name="classroom-pilot"]')?.getAttribute('content') === 'enabled';
}
