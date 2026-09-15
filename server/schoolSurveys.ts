import { sql } from 'drizzle-orm';
import { db } from './db';
import type { SurveyResult } from '../shared/surveys';

export async function getSchoolSurveys(key: string, kind: 'school' | 'center' = 'school'): Promise<SurveyResult[]> {
  const filter = kind === 'school' ? sql`r.school_dbn = ${key.toUpperCase()}` : sql`r.center_id IN (SELECT id FROM nyceec_centers WHERE loc_code = ${key.toUpperCase()})`;
  const result = await db.execute(sql`
    SELECT s.year, s.instrument, r.source_id AS "sourceId", r.source_name AS "sourceName",
      s.source_url AS "sourceUrl", s.source_hash AS "sourceHash", s.imported_at AS "importedAt",
      r.response_count AS "responseCount", r.response_rate AS "responseRate", r.metrics
    FROM school_survey_results r JOIN school_survey_releases s ON s.id = r.release_id
    WHERE ${filter} AND s.year = 2026 ORDER BY s.instrument, r.source_id`);
  return result.rows.map(row=>({
    ...row,
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
    importedAt: new Date(Number(row.importedAt)).toISOString(),
  })) as SurveyResult[];
}
