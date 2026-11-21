import type { RequestHandler } from 'express';
import { accountAccess } from './familyBilling';
import { storage } from './storage';

export async function hasSchoolResearchAccess(userId?:string) {
  if (!userId) return false;
  const user=await storage.getUser(userId);
  return user ? (await accountAccess(user)).research : false;
}

export const requireSchoolResearchAccess:RequestHandler = async (req,res,next) => {
  res.set('Cache-Control','private, no-store').vary('Cookie');
  if (!req.session?.userId) {
    res.status(401).json({message:'Sign in to view school classroom data.'});
    return;
  }
  try {
    if (!await hasSchoolResearchAccess(req.session.userId)) {
      res.status(403).json({message:'An active membership is required to view school classroom data.'});
      return;
    }
    next();
  } catch (error) {
    console.error('[SCHOOL_RESEARCH_ACCESS]',error);
    res.status(503).json({message:'Unable to check school research access.'});
  }
};
