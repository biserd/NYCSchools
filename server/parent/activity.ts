export type FamilyActivity='family_visited'|'paid_family_visited'|'event_saved'|'whatsapp_connected'|'reminder_scheduled'|'reminder_delivered'|'reminder_canceled';
export async function recordFamilyActivity(db:D1Database,userId:string,event:FamilyActivity,key:string,channel:'web'|'whatsapp'|'system'='web',now=Date.now()) {
  // Controlled event names + opaque keys only. No title, child, phone, email or message content.
  try{await db.prepare('INSERT OR IGNORE INTO family_activity(id,user_id,event_type,channel,occurred_at,dedupe_key) VALUES (?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),userId,event,channel,now,`${userId}:${event}:${key}`).run();}
  catch{console.warn(JSON.stringify({message:'Family activity recording unavailable',event}));} // Analytics cannot block a parent action.
}
export async function familyActivationOverview(db:D1Database,now=Date.now()) {
  const since=now-28*86400000;
  const exclude=`u.email NOT LIKE '%@example.%' AND u.email NOT LIKE '%.invalid' AND u.id NOT LIKE 'test-%' AND lower(u.email)!='biserd@gmail.com'`;
  const cohorts=await db.prepare(`WITH visits AS (
    SELECT a.user_id,min(a.occurred_at) first_visit FROM family_activity a JOIN users u ON u.id=a.user_id
    WHERE a.event_type='paid_family_visited' AND a.occurred_at>=? AND ${exclude} GROUP BY a.user_id
  ) SELECT count(*) paid_visitors,
    sum(EXISTS(SELECT 1 FROM parent_whatsapp_links w WHERE w.user_id=v.user_id AND w.phone IS NOT NULL AND w.consent_at IS NOT NULL)) connected_now,
    sum(CASE WHEN first_visit<=? THEN 1 ELSE 0 END) activation_eligible,
    sum(CASE WHEN first_visit<=? AND EXISTS(SELECT 1 FROM family_activity a WHERE a.user_id=v.user_id AND a.event_type='reminder_scheduled' AND a.occurred_at>=v.first_visit AND a.occurred_at<v.first_visit+604800000) THEN 1 ELSE 0 END) activated_in_7d,
    sum(CASE WHEN first_visit<=? THEN 1 ELSE 0 END) repeat_eligible,
    sum(CASE WHEN first_visit<=? AND EXISTS(SELECT 1 FROM family_activity a WHERE a.user_id=v.user_id AND a.event_type IN ('event_saved','reminder_scheduled') AND a.occurred_at>=v.first_visit+604800000 AND a.occurred_at<v.first_visit+1209600000) THEN 1 ELSE 0 END) meaningful_week2
    FROM visits v`).bind(since,now-7*86400000,now-7*86400000,now-14*86400000,now-14*86400000).first<Record<string,number|null>>();
  const delivery=await db.prepare(`SELECT r.status,count(*) count FROM parent_reminders r JOIN users u ON u.id=r.user_id WHERE r.created_at>=? AND ${exclude} GROUP BY r.status`).bind(since).all<{status:string;count:number}>();
  return {windowDays:28,asOf:now,cohort:cohorts?Object.fromEntries(Object.entries(cohorts).map(([key,value])=>[key,value??0])):null,delivery:delivery.results,note:'First recorded paid Family visit in the last 28 days. Activation = scheduling a reminder within 7 days; only cohorts at least 7 days old are eligible. Week-2 use = saving an event or scheduling a reminder in days 8–14; only cohorts at least 14 days old are eligible. Current connection is a snapshot, not a historical funnel stage. Provider delivered/read is not proof the parent acted. Owner and obvious test accounts excluded. Instrumentation starts with migration 0013; no historical backfill.'};
}
