import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import { db } from './db';
import { getSchoolSlug } from '../shared/school-utils';
import { classTotals, latestObservationVersions, PILOT_API, PILOT_SCHOOL, type PilotData, type RegisterCell, type ReleasePoint, type ProgramClassSize } from '../shared/classroomPilot';

export type PilotRead = <T extends Record<string,unknown>>(statement: string, params?: string[]) => Promise<T[]>;
type Release = ReleasePoint & { label: string; status: string; summary: string };
type ClassRow = ProgramClassSize & { dbn: string; sourceName: string; canonicalName: string | null };

export const readClassroomD1: PilotRead = async <T extends Record<string,unknown>>(statement: string, params: string[] = []) => {
  const parts = statement.split('?');
  if (parts.length !== params.length + 1) throw new Error('Invalid classroom data query');
  return db.all<T>(sql.join(parts.flatMap((part,i) => i < params.length ? [sql.raw(part), sql`${params[i]}`] : [sql.raw(part)]),sql.raw('')));
};

export function classroomPreviewEnabled() {
  return (process.env.ENVIRONMENT === 'staging' || process.env.ENVIRONMENT === 'production') &&
    process.env.CLASSROOM_PILOT_ENABLED === 'true';
}

export async function loadClassroomPilot(read: PilotRead = readClassroomD1): Promise<PilotData | null> {
  const releaseFields = 'id, observed_on AS observedOn, revision, status, release_label AS label, summary_json AS summary';
  const [registerReleases, classReleases] = await Promise.all([
    read<Release>(`SELECT ${releaseFields} FROM classroom_pilot_releases WHERE id IN ('register-2025-26-audited','register-2026-27-preliminary') AND status != 'forecast'`),
    read<Release>(`SELECT ${releaseFields} FROM classroom_pilot_releases WHERE dataset = 'class_size' AND observed_on IN ('2025-10-31','2026-10-31') AND status IN ('preliminary','revised')`),
  ]);
  const previousRegister = registerReleases.find(r => r.id === 'register-2025-26-audited');
  const currentRegister = registerReleases.find(r => r.id === 'register-2026-27-preliminary');
  const [priorClasses, currentClasses] = latestObservationVersions(classReleases);
  if (!previousRegister || !currentRegister || !priorClasses || !currentClasses) return null;
  const [rows, registers, caps] = await Promise.all([
    read<ClassRow & { releaseId: string }>(`SELECT c.release_id AS releaseId, c.dbn, c.school_name AS sourceName, s.name AS canonicalName,
      c.program, c.students, c.classes
      FROM classroom_pilot_classes c LEFT JOIN schools s ON s.dbn = c.dbn
      WHERE c.release_id IN (?,?) AND c.grade = 'K' ORDER BY c.dbn,c.program`, [priorClasses.id,currentClasses.id]),
    read<RegisterCell & { dbn: string; releaseId: string; grade: string }>(`SELECT dbn, release_id AS releaseId, grade, enrolled AS count, value_status AS status
      FROM classroom_pilot_register WHERE dbn LIKE '02%' AND release_id IN (?,?) AND (grade = 'K' OR dbn = ?)`, [previousRegister.id,currentRegister.id,PILOT_SCHOOL]),
    read<{ eligible: number; meeting: number }>(`SELECT c.eligible,c.meeting FROM classroom_pilot_caps c
      JOIN classroom_pilot_releases r ON r.id = c.release_id WHERE r.dataset = 'cap' AND r.observed_on = ?
      AND r.status != 'forecast' AND c.dbn = ? AND c.grade = 'K' ORDER BY r.revision DESC LIMIT 1`, [currentClasses.observedOn,PILOT_SCHOOL]),
  ]);
  const current = rows.filter(r => r.releaseId === currentClasses.id);
  const previous = rows.filter(r => r.releaseId === priorClasses.id);
  if (!current.length || !previous.length) return null;
  const cells = new Map(registers.map(r => [`${r.dbn}:${r.releaseId}:${r.grade}`,{count:r.count,status:r.status}]));
  const value = (dbn: string, release: Release, grade = 'K'): RegisterCell =>
    cells.get(`${dbn}:${release.id}:${grade}`) ?? {count:null,status:'missing'};
  const grouped = new Map<string,ClassRow[]>();
  for (const row of current) {
    const group = grouped.get(row.dbn);
    if (group) group.push(row); else grouped.set(row.dbn,[row]);
  }
  const districtRows = [...grouped.values()].map(group => {
    const {dbn,sourceName,canonicalName} = group[0];
    return {
      dbn, name: canonicalName ?? sourceName,
      path: canonicalName ? `/school/${getSchoolSlug({dbn,name:canonicalName})}` : null,
      previousK:value(dbn,previousRegister),currentK:value(dbn,currentRegister),
      programs:group.map(({program,students,classes})=>({program,students,classes})),
    };
  }).sort((a,b)=>a.name.localeCompare(b.name,'en-US'));
  const sample = districtRows.find(r => r.dbn === PILOT_SCHOOL);
  if (!sample) return null;
  const previousSchool = previous.filter(row => row.dbn === PILOT_SCHOOL);
  const currentClassSummary = JSON.parse(currentClasses.summary) as {
    schoolDistribution?: PilotData['school']['distribution'];
    matched?: PilotData['matched'];
  };
  const grades = ['3K','PreK','K',...Array.from({length:12},(_,i)=>String(i+1))].map(grade=>({
    grade,previous:value(PILOT_SCHOOL,previousRegister,grade),current:value(PILOT_SCHOOL,currentRegister,grade),
  })).filter(row=>(row.previous.count??0)>0||(row.current.count??0)>0||row.previous.status==='suppressed'||row.current.status==='suppressed');
  return {
    school:{
      previousTotal:value(PILOT_SCHOOL,previousRegister,'Total'),currentTotal:value(PILOT_SCHOOL,currentRegister,'Total'),
      previousK12:value(PILOT_SCHOOL,previousRegister,'Total K-12'),currentK12:value(PILOT_SCHOOL,currentRegister,'Total K-12'),
      previousK:sample.previousK,currentK:sample.currentK,grades,programs:sample.programs,cap:caps[0]??null,
      distribution:currentClassSummary.schoolDistribution??[],
    },
    district:{rows:districtRows,...classTotals(current)},
    priorDistrict:{...classTotals(previous),schools:new Set(previous.map(row=>row.dbn)).size},
    priorSchoolPrograms:previousSchool.map(({program,students,classes})=>({program,students,classes})),
    sources:{previousRegister:previousRegister.label,currentRegister:currentRegister.label,priorClasses:priorClasses.label,currentClasses:currentClasses.label},
    summary:JSON.parse(currentRegister.summary),
    matched:currentClassSummary.matched??null,
  };
}

export function registerClassroomPilotRoutes(app: Express) {
  app.get(PILOT_API, async (_req,res)=>{
    res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
    if (!classroomPreviewEnabled()) return res.status(404).json({message:'Not found'});
    try {
      const data=await loadClassroomPilot();
      return data ? res.json(data) : res.status(503).json({message:'Pilot data unavailable'});
    } catch (error) {
      console.error('[CLASSROOM_PILOT]',error);
      return res.status(503).json({message:'Pilot data unavailable'});
    }
  });
}
