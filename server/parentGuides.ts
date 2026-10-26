import { storage } from './storage';
import { getCached, setCache, CACHE_TTL_DEFAULT } from './cache';
import { getParentGuide } from '../shared/parent-guides';
import { buildParentGuideData, attachSurveyEvidence, type GuideData } from '../shared/parent-guide-data';
import { getSchoolSurveysBatch } from './schoolSurveys';

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
  if (guide.kind === 'comparison') data = attachSurveyEvidence(data, await getSchoolSurveysBatch(guide.dbns || []).catch(()=>({})));
  setCache(key, data, CACHE_TTL_DEFAULT);
  return data;
}
