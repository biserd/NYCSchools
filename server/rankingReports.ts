import { storage } from './storage';
import { buildRankingReport, type SchoolStage, type RankingReport } from '../shared/ranking-report';
import { getSchoolSurveysBatch } from './schoolSurveys';
import { getCached, setCache, CACHE_TTL_DEFAULT } from './cache';
import type { SurveyResult } from '../shared/surveys';
export type RankingPayload = { report: RankingReport; surveys: Record<string, SurveyResult[]> };
export async function loadRankingReport(stage: SchoolStage): Promise<RankingPayload> {
  const key = 'ranking-report:' + stage;
  const cached = getCached<RankingPayload>(key);
  if (cached) return cached;
  const report = buildRankingReport(await storage.getSchools(), stage);
  const surveys = await getSchoolSurveysBatch(report.groups.flatMap(g=>g.rows.map(r=>r.dbn))).catch(() => ({}));
  const data = { report, surveys };
  setCache(key, data, CACHE_TTL_DEFAULT);
  return data;
}
