import { storage } from './storage';
import { getCached, setCache, CACHE_TTL_DEFAULT } from './cache';
import { getParentGuide } from '../shared/parent-guides';
import { buildParentGuideData, attachSurveyEvidence, type GuideData } from '../shared/parent-guide-data';
import { getSchoolSurveys, getSchoolSurveysBatch } from './schoolSurveys';
import { buildDistrictPicks, centerShortlistRecord, type DistrictCandidate, type DistrictPick } from '../shared/shortlist-data';
import { getSchoolUrl } from '../shared/school-utils';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Only a small, curated public result reaches the browser; never account data.
export async function loadParentGuideData(slug: string): Promise<GuideData | null> {
  const guide = getParentGuide(slug);
  if (!guide) return null;
  const key = `parent-guide:${slug}`;
  const cached = getCached<GuideData>(key);
  if (cached) return cached;
  const schools = guide.kind === 'comparison'
    ? (await Promise.all((guide.dbns ?? []).map(dbn => storage.getSchool(dbn)))).filter((s): s is NonNullable<typeof s> => !!s)
    : guide.kind === 'continuity' ? await storage.getSchools() : [];
  const privateSchools = guide.kind === 'private' ? await storage.getPrivateSchools() : [];
  const graduation = guide.slug === 'townsend-harris-vs-stuyvesant' ? (await Promise.all((guide.dbns ?? []).map(dbn => storage.getHSGraduation(dbn)))).flat() : [];
  let data = buildParentGuideData(guide, schools, privateSchools, graduation);
  if (guide.shortlistMode) {
    const mode = guide.shortlistMode;
    const grade = mode === 'pre-k' ? 'PK' : 'K';
    const [result, featured] = await Promise.all([
      db.execute<DistrictCandidate>(sql`
        SELECT s.dbn, s.district, s.name, s.grade_band AS grades, e.enrolled,
               s.assessment_year, s.assessment_source, s.ela_grade3, s.math_grade3
        FROM enrollment_data e JOIN schools s ON s.dbn=e.dbn
        WHERE e.school_year='2025-2026' AND e.grade=${grade} AND e.is_suppressed=0 AND e.enrolled>0
          AND s.district BETWEEN 1 AND 32 AND s.dbn GLOB '[0-9][0-9][MKXQR][0-9][0-9][0-9]'
          AND s.district=CAST(substr(s.dbn,1,2) AS INTEGER) AND (${grade}='K' OR s.has_prek=1)
        ORDER BY s.district, e.enrolled, s.dbn`),
      Promise.all((guide.verified?.rows ?? []).flatMap(row => {
        const id = row.name.match(/\(([0-9]{2}[A-Z][A-Z0-9]{3})\)$/)?.[1];
        if (!id) return [];
        return [(async (): Promise<DistrictPick> => ({ id, district: Number(id.slice(0, 2)), name: row.name.split(' · ')[1].replace(/ \([A-Z0-9]+\)$/, ''), href: row.profile,
          enrolled: null, detail: row.cells[0], visit: row.cells.at(-1),
          ...(mode === 'pre-k' && row.dbKey && { evidence: centerShortlistRecord(row.dbKey, await getSchoolSurveys(row.dbKey, 'center')) }),
        }))()];
      })),
    ]);
    data.districtPicks = buildDistrictPicks(result.rows, featured, mode, getSchoolUrl);
  }
  if (guide.kind === 'comparison') data = attachSurveyEvidence(data, await getSchoolSurveysBatch(guide.dbns || []).catch(()=>({})));
  setCache(key, data, CACHE_TTL_DEFAULT);
  return data;
}
