import application from './index-worker';

// Isolated D1: no real accounts, production credentials or outbound bindings.
// User-owned writes are enabled for testing sessions and saved schools.
export default {
  async queue(batch,env,ctx){
    if(env.ENVIRONMENT!=='staging'||!Number.isFinite(Date.parse(env.STAGING_EXPIRES_AT))||Date.now()>=Date.parse(env.STAGING_EXPIRES_AT)){batch.ackAll();return;}
    await application.queue(batch,env);
  },
  async fetch(request, env, ctx) {
    const expiry = Date.parse(env.STAGING_EXPIRES_AT);
    if (env.ENVIRONMENT !== 'staging' || !Number.isFinite(expiry) || Date.now() >= expiry) {
      return new Response('Staging preview expired', {status:410});
    }
    const path = new URL(request.url).pathname;
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n');
    if (/^\/api\/(admin|cron|stripe|webhooks|newsletter|contact|checkout|customer-portal)(\/|$)/.test(path)) {
      return Response.json({message:'External delivery and administrative jobs are disabled in this preview.'},{status:403});
    }
    const response = await application.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    headers.set('Cache-Control','no-store');
    headers.set('X-Staging-Database','D1');
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'none'; form-action 'self'");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
} satisfies ExportedHandler<Env>;
