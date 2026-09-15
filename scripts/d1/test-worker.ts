import { withDatabaseConnection, db } from '../../server/db';
import { storage } from '../../server/storage';
import * as s from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';

const tables = new Map(Object.values(s).filter(v=>v instanceof SQLiteTable).map(t=>{const c=getTableConfig(t);return [c.name,c];}));
function assert(value:unknown,message:string):asserts value {if(!value)throw new Error(message);}
async function writes(binding:D1Database) {
  const tag=`d1-test-${crypto.randomUUID()}`;
  const school=(await storage.getSchools())[0];assert(school,'Missing schools');
  const user=await storage.createUser({email:`${tag}@example.invalid`,password:'synthetic-not-a-login-hash',firstName:'Migration test',dripEmailsSent:[]});
  const passed:string[]=[];
  const now=new Date(),later=new Date(now.getTime()+3600000);
  try {
    assert(user.id && user.createdAt instanceof Date && Array.isArray(user.dripEmailsSent),'User type mapping');passed.push('users: UUID, Date, JSON defaults');
    await storage.updateUserStripeInfo(user.id,{subscriptionStatus:'active',subscriptionPlan:'season_pass',subscriptionExpiresAt:later});
    assert((await storage.getUser(user.id))?.subscriptionExpiresAt?.getTime()===later.getTime(),'Subscription timestamp');passed.push('subscription state (synthetic, no Stripe calls)');
    await storage.addFavorite({userId:user.id,schoolDbn:school.dbn});
    assert(await storage.isFavorite(user.id,school.dbn),'Favorite missing');
    assert((await storage.getFavoriteStatusBatch(user.id,(await storage.getSchools()).map(x=>x.dbn)))[school.dbn],'Large favorites batch');
    await storage.removeFavorite(user.id,school.dbn);assert(!await storage.isFavorite(user.id,school.dbn),'Favorite deletion');passed.push('favorites CRUD and >100-ID query');
    await storage.upsertUserProfile({userId:user.id,homeAddress:'Synthetic address',latitude:40.7,longitude:-74});
    assert((await storage.getUserProfile(user.id))?.latitude===40.7,'Profile');passed.push('profile upsert');
    const review=await storage.createReview({userId:user.id,schoolDbn:school.dbn,rating:4,reviewText:'Synthetic migration test'});
    await storage.updateReview(review.id,user.id,5,'Updated synthetic test');assert((await storage.getUserReview(user.id,school.dbn))?.rating===5,'Review update');
    await storage.deleteReview(review.id,user.id);passed.push('reviews CRUD');
    const tracked=await storage.addTrackedSchool({userId:user.id,schoolDbn:school.dbn,openHouseDate:later,notifyOpenHouse:true});
    assert((await storage.getTrackedSchoolsNeedingNotification(24)).some(x=>x.id===tracked.id),'Reminder date comparison');
    await storage.updateTrackedSchool(tracked.id,user.id,{notes:'Synthetic'});await storage.removeTrackedSchool(user.id,school.dbn);passed.push('tracker and reminder queries');
    const chat=await storage.createChatSession({userId:user.id,title:'Synthetic'});
    await storage.addChatMessage({sessionId:chat.id,role:'user',content:'Synthetic'});assert((await storage.getChatMessages(chat.id)).length===1,'Chat');
    await storage.deleteChatSession(chat.id);assert((await storage.getChatMessages(chat.id)).length===0,'Chat cascade');passed.push('chat persistence and cascade');
    await storage.createPasswordResetToken(user.id,tag,later);const reset=await storage.findPasswordResetToken(tag);assert(reset?.expiresAt.getTime()===later.getTime(),'Reset date');await storage.markPasswordResetTokenUsed(reset.id);
    await storage.createMagicLinkToken(user.id,tag,later);const magic=await storage.findMagicLinkToken(tag);assert(magic,'Magic token');await storage.markMagicLinkTokenUsed(magic.id);passed.push('password and magic-link tokens');
    const key=await storage.createApiKey({userId:user.id,name:'Synthetic',keyPrefix:'test_',keyHash:tag});
    const increments=await Promise.all(Array.from({length:12},()=>storage.incrementApiRateState(key.id,now)));
    assert(Math.max(...increments.map(x=>x.minuteCount))===12,'Concurrent counter lost increments');
    const roll=await storage.incrementApiRateState(key.id,new Date(now.getTime()+61000));assert(roll.minuteCount===1&&roll.dayCount===13,'Rate rollover');
    await storage.insertApiRequestLogs(Array.from({length:31},()=>({keyId:key.id,path:'/synthetic',status:429,ip:'192.0.2.1',ts:now})));
    const usage=await storage.getApiKeyUsageSummary(key.id,new Date(now.getTime()-1000));assert(usage.total===31&&usage.errors429===31&&usage.distinctIps===1,'Usage aggregates');
    assert(await storage.recordAbuseAlert({keyId:key.id,alertType:'synthetic',alertDay:'2026-09-15',detail:{test:true}}),'Alert insert');
    assert(!await storage.recordAbuseAlert({keyId:key.id,alertType:'synthetic',alertDay:'2026-09-15',detail:{test:true}}),'Alert dedup');
    await db.delete(s.apiRequestLog).where(eq(s.apiRequestLog.keyId,key.id));passed.push('API keys, concurrent counters, bulk logs, alert dedup');
    await storage.markWebhookEventProcessed(tag,'synthetic');await storage.markWebhookEventProcessed(tag,'synthetic');assert(await storage.isWebhookEventProcessed(tag),'Webhook dedup');passed.push('webhook event persistence/idempotency');
    await db.insert(s.sessions).values({sid:tag,sess:{cookie:{maxAge:1000},userId:user.id},expire:later});
    const [session]=await db.select().from(s.sessions).where(eq(s.sessions.sid,tag));assert(session.expire.getTime()===later.getTime()&&typeof session.sess==='object','Session');passed.push('session JSON/date persistence');
    await db.insert(s.oauthClients).values({clientId:tag,clientName:'Synthetic migration test',redirectUris:['https://example.invalid/callback']});
    const client=await db.query.oauthClients.findFirst({where:eq(s.oauthClients.clientId,tag)});assert(client?.redirectUris[0]==='https://example.invalid/callback','OAuth array');
    await db.insert(s.oauthAuthorizationCodes).values({code:tag,userId:user.id,clientId:tag,redirectUri:'https://example.invalid/callback',codeChallenge:tag,expiresAt:later});
    await db.insert(s.oauthAccessTokens).values({token:tag,userId:user.id,clientId:tag,expiresAt:later});
    await db.insert(s.oauthRefreshTokens).values({token:tag,accessToken:tag,userId:user.id,clientId:tag,expiresAt:later});
    assert((await db.query.oauthAccessTokens.findFirst({where:eq(s.oauthAccessTokens.token,tag)}))?.expiresAt.getTime()===later.getTime(),'OAuth date');passed.push('OAuth relational queries, JSON arrays and token timestamps');
    await db.update(s.users).set({dripEmailsSent:sql`json_insert(COALESCE(${s.users.dripEmailsSent}, '[]'), '$[#]', 'synthetic')`}).where(eq(s.users.id,user.id));
    assert((await storage.getUser(user.id))?.dripEmailsSent?.[0]==='synthetic','Drip JSON append');passed.push('drip campaign JSON append');
    const center=(await storage.getNyceecCenters())[0];
    const centerReview=await storage.createNyceecReview({userId:user.id,locCode:center.locCode,rating:4});await storage.deleteNyceecReview(centerReview.id,user.id);passed.push('early-childhood reviews');
    let rolledBack=false;
    try {await binding.batch([binding.prepare('INSERT INTO app_settings(key,value) VALUES (?,?)').bind(tag,'synthetic'),binding.prepare('INSERT INTO favorites(user_id,school_dbn) VALUES (?,?)').bind('missing-synthetic-user',school.dbn)]);} catch {rolledBack=true;}
    assert(rolledBack,'Invalid FK batch did not fail');assert(!(await db.select().from(s.appSettings).where(eq(s.appSettings.key,tag))).length,'D1 batch did not rollback');passed.push('atomic batch rollback and foreign keys');
    return passed;
  } finally {
    await db.delete(s.sessions).where(eq(s.sessions.sid,tag));
    await db.delete(s.processedWebhookEvents).where(eq(s.processedWebhookEvents.eventId,tag));
    await db.delete(s.users).where(eq(s.users.id,user.id));
    await db.delete(s.oauthClients).where(eq(s.oauthClients.clientId,tag));
  }
}

// Run only with authenticated `wrangler dev --remote`; this is not a deployed route.
export default {async fetch(request:Request,env:Env){
  if(env.ENVIRONMENT!=='staging')return new Response('Staging only',{status:403});
  try{return await withDatabaseConnection(async()=>{
    const url=new URL(request.url);
    if(url.pathname==='/query'&&request.method==='POST'){
      const input=await request.json() as {sql:string;params:unknown[];method:string};
      if(typeof input.sql!=='string'||!/^\s*(select|insert|update|delete|with)\b/i.test(input.sql)||input.sql.length>100000||!Array.isArray(input.params)||input.params.length>100)return new Response('Invalid query',{status:400});
      const statement=env.DB.prepare(input.sql).bind(...input.params);
      if(input.method==='run'){await statement.run();return Response.json({rows:[]});}
      const rows=await statement.raw();return Response.json({rows:input.method==='get'?rows[0]:rows});
    }
    if(url.pathname==='/cleanup-web-test'&&request.method==='POST'){
      const email=url.searchParams.get('email')||'';
      if(!/^d1-webtest-[a-f0-9-]+@example\.invalid$/.test(email))return new Response('Invalid synthetic identity',{status:400});
      const user=await storage.getUserByEmail(email);
      if(user){await db.execute(sql`DELETE FROM sessions WHERE json_extract(sess,'$.userId')=${user.id}`);await db.delete(s.users).where(eq(s.users.id,user.id));}
      return Response.json({cleaned:true});
    }
    if(url.pathname==='/writes'&&request.method==='POST')return Response.json({passed:await writes(env.DB)});
    if(url.pathname==='/safety-calculation'&&request.method==='GET'){
      const key=url.searchParams.get('school')||'06G262';
      const school=await storage.getSchool(key);assert(school?.latitude&&school.longitude,'School coordinates missing');
      const [saved]=await db.select().from(s.schoolSafetyIndex).where(eq(s.schoolSafetyIndex.schoolKey,key)).limit(1);assert(saved,'Safety window missing');
      const prior=new Date(saved.periodStart);prior.setMonth(prior.getMonth()-12);
      const {computeSafetyRows}=await import('../../server/services/safetyIndex');
      const computed=await computeSafetyRows({type:'public',key,lat:school.latitude,lng:school.longitude},prior,saved.periodStart,saved.periodEnd);
      return Response.json({window:{prior,from:saved.periodStart,to:saved.periodEnd},rows:computed.map(r=>({...r,current:{...r.current,byCategory:Object.fromEntries(r.current.byCategory)},prior:{...r.prior,byCategory:Object.fromEntries(r.prior.byCategory)}}))});
    }
    if(request.method!=='GET')return new Response('Not allowed',{status:405});
    if(url.pathname==='/inventory'){
      const counts:Record<string,number>={};for(const name of tables.keys())counts[name]=(await env.DB.prepare(`SELECT count(*) n FROM "${name}"`).first<number>('n'))!;
      return Response.json({counts,foreignKeys:(await env.DB.prepare('PRAGMA foreign_key_check').all()).results});
    }
    const table=url.searchParams.get('table'),offset=Number(url.searchParams.get('offset')||0);
    if(!table||!tables.has(table)||!Number.isSafeInteger(offset)||offset<0)return new Response('Invalid table/offset',{status:400});
    return Response.json((await env.DB.prepare(`SELECT * FROM "${table}" ORDER BY 1,2 LIMIT 5000 OFFSET ?`).bind(offset).all()).results);
  });}catch(error){return Response.json({error:String(error),cause:error instanceof Error?String(error.cause):null},{status:500});}
}};
