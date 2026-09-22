import application from './index-worker';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { startSafetyRefresh } from './services/safetyQueue';
import { parentWhatsappWebhook, PARENT_WEBHOOK_PATH } from './parent/whatsapp';
import {familyCheckoutAvailable} from './parent/checkout';

export {ParentAssistantAgent} from './parent/agent-sdk';

// Private RPC only: this entrypoint has no HTTP route and can only be reached
// through an explicitly configured same-account service binding.
export class StagingMaintenance extends WorkerEntrypoint<Env> {
  async refreshSafety(expectedDatabase: string) {
    if (expectedDatabase !== 'e48a9ae9-4948-4dae-863a-06f6b026b436' || this.env.ENVIRONMENT !== 'staging' || !(Date.now() < Date.parse(this.env.STAGING_EXPIRES_AT))) {
      throw new Error('Staging maintenance target or expiry check failed');
    }
    return startSafetyRefresh(this.env);
  }
}

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
    // Dedicated signed provider ingress: deliberately outside session/CSRF
    // middleware. The handler enforces Twilio signature, account and recipient.
    // Calendar reads additionally require account linking. Other preview delivery remains disabled.
    if (path === PARENT_WEBHOOK_PATH) {
      try { return await parentWhatsappWebhook(request, env, ctx); }
      catch { console.error('Parent WhatsApp staging webhook failed'); return new Response('Webhook unavailable', { status: 503 }); }
    }
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n');
    // Allow only the exact signed test webhook and authenticated portal when a
    // separate test-mode rehearsal is explicitly enabled. Never allow Pass checkout.
    const testBillingRoute=familyCheckoutAvailable(env)&&!!Reflect.get(env,'STRIPE_WEBHOOK_SECRET')&&
      (path==='/api/stripe/webhook'||path==='/api/customer-portal');
    const retiredCheckout = request.method === 'POST' && (path === '/api/checkout' || path === '/api/checkout/guest');
    if (!retiredCheckout&&!testBillingRoute&&/^\/api\/(admin|cron|stripe|webhooks|newsletter|contact|checkout|customer-portal)(\/|$)/.test(path)) {
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
