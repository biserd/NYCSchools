import { Client } from 'pg';
// Temporary authenticated remote-preview helper; never deployed publicly.
const publicTables = new Set(['schools','school_historical_scores','hs_admissions_program','hs_graduation','hs_regents','school_attendance','school_discipline','nyceec_centers','nyceec_ai_insights','admissions_offers','enrollment_data','admissions_metrics','private_schools','private_school_history','school_zones','school_safety_index','nypd_complaints','school_survey_releases','school_survey_results']);
const privateTables = new Set(['users','sessions','favorites','reviews','user_profiles','ai_chat_sessions','ai_chat_messages','tracked_schools','password_reset_tokens','magic_link_tokens','processed_webhook_events','oauth_clients','oauth_authorization_codes','oauth_access_tokens','oauth_refresh_tokens','api_keys','api_key_rate_state','api_request_log','api_abuse_alerts','nyceec_reviews','contact_submissions','app_settings']);
export default { async fetch(request, env) {
  if (request.method !== 'GET') return new Response('Read only', {status:405});
  const url = new URL(request.url);
  const client = new Client({connectionString:env.HYPERDRIVE.connectionString});
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    if(url.pathname === '/inventory') {
      const result = await client.query("SELECT schemaname,relname name,n_live_tup estimated_rows,pg_total_relation_size(relid)::text bytes FROM pg_stat_user_tables ORDER BY relname");
      return Response.json(result.rows);
    }
    if(url.pathname === '/constraints') return Response.json((await client.query("SELECT t.relname, c.conname, pg_get_constraintdef(c.oid) definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,c.conname")).rows);
    if(url.pathname === '/indexes') return Response.json((await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows);
    if(url.pathname === '/settings-keys') return Response.json((await client.query('SELECT key,length(value) value_length FROM app_settings ORDER BY key')).rows);
    const table=url.searchParams.get('table');
    if(!publicTables.has(table)&&!(env.ALLOW_PRIVATE_REHEARSAL==='true'&&privateTables.has(table))) return new Response('Not allowed',{status:403});
    if(url.pathname === '/columns') return Response.json((await client.query('SELECT column_name,data_type,udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',table])).rows);
    if(url.pathname === '/count') return Response.json((await client.query(`SELECT count(*)::int count FROM "${table}"`)).rows[0]);
    const offset=Number(url.searchParams.get('offset')||0);
    if(!Number.isSafeInteger(offset)||offset<0) return new Response('Bad offset',{status:400});
    const rows=(await client.query(`SELECT * FROM "${table}" ORDER BY 1,2 LIMIT ${table==='nypd_complaints'?5000:500} OFFSET $1`,[offset])).rows;
    return Response.json(rows);
  } finally {await client.query('ROLLBACK');await client.end();}
}};
