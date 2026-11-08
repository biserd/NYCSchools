import { Router, type Request, type RequestHandler } from "express";
import { ZodError } from "zod";
import { addChild, updateChild, createHousehold, getOverview, removeChild, removeEvent, TuckError } from "./store";
import { createParentWhatsappLink, disconnectParentWhatsapp, parentWhatsappStatus } from '../parent/account';
import type { ParentWhatsappEnvironment } from '../parent/whatsapp';
import { assistantOverview, savePreferences, createReminder, cancelReminder, localParts, preferences,hasAssistantAccess,reminderDeliveryReady } from '../parent/service';
import {saveFamilyEvent} from '../parent/family-events';
import {recordFamilyActivity} from '../parent/activity';
import {parentWhatsappReady} from '../parent/whatsapp';
import { confirmDraft, rejectDraft, suggestCalendarEvent } from '../parent/assistant';
import { answerParent, clearParentConversation } from '../parent/assistant-gateway';
import { calendarSuggestions, CALENDAR_SCOPE } from '../parent/calendar';
import { familyCheckout, familyCheckoutAvailable } from '../parent/checkout';
import { getUncachableStripeClient } from '../stripeClient';

function userId(req: Request): string {
  if (!req.session?.userId) throw new TuckError(401, "Sign in to use Tuck.");
  return req.session.userId;
}

export function tuckRouter(authenticate: RequestHandler, appOrigin: () => string,
  parentEnvironment: () => Promise<ParentWhatsappEnvironment> = async () => (await import('cloudflare:workers')).env) {
  const router = Router();
  router.use((req, res, next) => {
    res.set({ "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" });
    const origin = req.get("origin");
    const mutation = !["GET", "HEAD"].includes(req.method);
    if ((origin && origin !== new URL(appOrigin()).origin) || req.get("sec-fetch-site") === "cross-site" || (mutation && !origin)) {
      return res.status(403).json({ message: "Use Tuck from your NYC School Ratings account." });
    }
    next();
  });
  router.use(authenticate);
  router.post('/family-checkout', async (req,res) => {
    try {
      const env=await parentEnvironment();
      if(!familyCheckoutAvailable(env))throw new TuckError(503,'Monthly checkout is not available yet.');
      const session=await familyCheckout(userId(req),env,await getUncachableStripeClient(),req.body?.attribution);
      console.info(JSON.stringify({event:'family_checkout_session_created',channel:'account'}));
      res.json(session);
    } catch(error) {
      if(error instanceof TuckError)console.warn(JSON.stringify({event:'family_checkout_blocked',channel:'account',status:error.status,reason:error.message}));
      else console.error(JSON.stringify({event:'family_checkout_failed',channel:'account',error_type:error instanceof Error?error.name:'unknown'}));
      throw error;
    }
  });
  router.get('/assistant', async (req,res) => res.json(await assistantOverview(userId(req),await parentEnvironment())));
  router.get('/assistant/history',async(req,res)=>{
    const env=await parentEnvironment();
    await (await import('../parent/service')).requireAssistant(userId(req),env);
    if(Reflect.get(env,'PARENT_AGENT_SDK_ENABLED')!=='true')return res.json({messages:[]});
    const {parentAgentHistory}=await import('../parent/agent-sdk');
    res.json({messages:await parentAgentHistory(userId(req),env)});
  });
  router.put('/assistant/preferences', async (req,res) => res.json(await savePreferences(userId(req),await parentEnvironment(),req.body)));
  router.post('/assistant/message', async (req,res) => res.json(await answerParent(userId(req),await parentEnvironment(),req.body)));
  router.delete('/assistant/context', async (req,res) => {await clearParentConversation(userId(req),await parentEnvironment());res.sendStatus(204);});
  router.post('/assistant/drafts/:id/confirm', async (req,res) => res.json(await confirmDraft(userId(req),await parentEnvironment(),req.params.id)));
  router.delete('/assistant/drafts/:id', async (req,res) => res.json(await rejectDraft(userId(req),await parentEnvironment(),req.params.id)));
  router.post('/assistant/reminders', async (req,res) => res.status(201).json(await createReminder(userId(req),await parentEnvironment(),req.body)));
  router.delete('/assistant/reminders/:id', async (req,res) => {await cancelReminder(userId(req),await parentEnvironment(),req.params.id);res.sendStatus(204);});
  router.get('/assistant/calendar', async (req,res) => {const env=await parentEnvironment(),p=await preferences(userId(req),env);res.json({scope:CALENDAR_SCOPE,events:calendarSuggestions(localParts(Date.now(),p.timezone).date)});});
  router.post('/assistant/calendar/:id', async (req,res) => res.json(await suggestCalendarEvent(userId(req),await parentEnvironment(),req.params.id,req.body?.confirmedScope===true)));
  router.get('/whatsapp', async (req, res) => res.json(await parentWhatsappStatus(userId(req), await parentEnvironment())));
  router.post('/whatsapp/link', async (req, res) => res.json(await createParentWhatsappLink(userId(req), await parentEnvironment(), req.body?.consent)));
  router.post('/whatsapp/disconnect', async (req, res) => { await disconnectParentWhatsapp(userId(req), await parentEnvironment()); res.sendStatus(204); });
  router.get("/overview", async (req, res) => {
    const id=userId(req),env=await parentEnvironment();await createHousehold(id);
    await recordFamilyActivity(env.DB,id,'family_visited',new Date().toISOString().slice(0,10));
    if(await hasAssistantAccess(id,env))await recordFamilyActivity(env.DB,id,'paid_family_visited',new Date().toISOString().slice(0,10));
    res.json(await getOverview(id,{whatsapp:parentWhatsappReady(env),automaticReminders:reminderDeliveryReady(env)}));
  });
  router.get('/schools',async(req,res)=>{
    const env=await parentEnvironment(),q=String(req.query.q||'').trim().slice(0,70);
    if(q.length<2)return res.json({schools:[]});
    const result=await env.DB.prepare(`SELECT dbn,name,grade_band gradeBand,district FROM schools WHERE instr(upper(dbn),upper(?))>0 OR instr(lower(name),lower(?))>0 ORDER BY CASE WHEN dbn=? THEN 0 ELSE 1 END,name LIMIT 8`).bind(q,q,q.toUpperCase()).all();
    res.json({schools:result.results});
  });
  router.post("/household", async (req, res) => res.json(await createHousehold(userId(req))));
  router.post("/children", async (req, res) => res.status(201).json(await addChild(userId(req), req.body)));
  router.put('/children/:id',async(req,res)=>res.json(await updateChild(userId(req),req.params.id,req.body)));
  router.post("/events", async (req, res) => res.status(201).json(await saveFamilyEvent(userId(req),await parentEnvironment(),req.body)));
  router.put('/events/:id',async(req,res)=>res.json(await saveFamilyEvent(userId(req),await parentEnvironment(),req.body,req.params.id)));
  router.delete("/events/:id", async (req, res) => { await removeEvent(userId(req), req.params.id); res.sendStatus(204); });
  router.delete("/children/:id", async (req, res) => { await removeChild(userId(req), req.params.id); res.sendStatus(204); });
  router.use((error: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    if (error instanceof ZodError) return res.status(400).json({ message: error.issues[0]?.message||"Check the supplied fields.", fields: error.flatten().fieldErrors });
    if (error instanceof TuckError) return res.status(error.status).json({ message: error.message });
    next(error);
  });
  return router;
}
