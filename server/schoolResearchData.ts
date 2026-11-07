import { eq, asc } from 'drizzle-orm';
import { db } from './db';
import { storage } from './storage';
import { schoolDemographicsHistory, type School } from '@shared/schema';
import { buildSchoolResearch, type SchoolResearchData } from '../shared/school-research';
import { getCached, setCache, CACHE_TTL_LONG } from './cache';
import type { Express } from 'express';

export async function getSchoolResearchData(school: School): Promise<SchoolResearchData> {
  const key = `school-research-v1-${school.dbn}`;
  const cached = getCached<SchoolResearchData>(key);
  if(cached) return cached;
  const [snapshots, regents] = await Promise.all([
    db.select().from(schoolDemographicsHistory).where(eq(schoolDemographicsHistory.dbn,school.dbn)).orderBy(asc(schoolDemographicsHistory.schoolYear)),
    storage.getHSRegents(school.dbn),
  ]);
  const data = buildSchoolResearch(school,snapshots,regents);
  setCache(key,data,CACHE_TTL_LONG);
  return data;
}

export function registerSchoolResearchRoutes(app: Express) {
  app.get('/api/schools/:dbn/research-data', async (req,res) => {
    const dbn=String(req.params.dbn).toUpperCase();
    if(!/^\d{2}[A-Z0-9]{4}$/.test(dbn))return res.status(400).json({error:'Invalid DBN'});
    try {
      const school=await storage.getSchool(dbn);
      if(!school)return res.status(404).json({error:'School not found'});
      res.json(await getSchoolResearchData(school));
    } catch(error) {
      console.error('School research data unavailable',error);
      res.status(500).json({error:'School research data temporarily unavailable'});
    }
  });
}
