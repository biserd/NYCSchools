import type Stripe from 'stripe';
import {FAMILY_PREMIUM} from '../../shared/plans';
import {TuckError} from '../tuck/store';
import type {AssistantEnvironment} from './service';

export function familyCheckoutAvailable(environment:object) {
  const env=environment as Record<string,unknown>;
  if(env.FAMILY_CHECKOUT_ENABLED!=='true'||env.PARENT_ASSISTANT_ENABLED!=='true'||!String(env.STRIPE_FAMILY_PREMIUM_PRICE_ID||'').startsWith('price_'))return false;
  if(env.ENVIRONMENT==='staging')return Date.now()<Date.parse(String(env.STAGING_EXPIRES_AT||''))&&String(env.STRIPE_TEST_SECRET_KEY||'').startsWith('sk_test_')&&String(env.STRIPE_TEST_PUBLISHABLE_KEY||'').startsWith('pk_test_');
  return env.ENVIRONMENT==='production'&&env.PARENT_LAUNCH_VERIFIED==='true'&&env.PARENT_REMINDERS_ENABLED==='true'&&/^HX[a-f0-9]{32}$/i.test(String(env.PARENT_REMINDER_CONTENT_SID||''))&&!!env.TWILIO_AUTH_TOKEN&&!!env.TWILIO_ACCOUNT_SID&&env.PARENT_WHATSAPP_ENABLED==='true';
}
export async function familyCheckout(userId:string,env:AssistantEnvironment,stripe:Stripe) {
  if(!familyCheckoutAvailable(env))throw new TuckError(503,'Monthly checkout is not available yet. No payment was taken.');
  const now=Date.now(),production=env.ENVIRONMENT==='production';
  const price=await stripe.prices.retrieve(env.STRIPE_FAMILY_PREMIUM_PRICE_ID!);
  if(!price.active||price.livemode!==production||price.currency!==FAMILY_PREMIUM.currency||price.unit_amount!==FAMILY_PREMIUM.amount||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||price.recurring.usage_type!=='licensed')throw new TuckError(503,'Monthly offer configuration does not match the advertised price.');
  const portals=await stripe.billingPortal.configurations.list({active:true,is_default:true,limit:1});
  const cancel=portals.data[0]?.features.subscription_cancel;
  if(!cancel?.enabled||cancel.mode!=='at_period_end')throw new TuckError(503,'Self-service cancellation must be configured before monthly checkout opens.');
  const user=await env.DB.prepare('SELECT email,stripe_customer_id,stripe_subscription_id FROM users WHERE id=?').bind(userId).first<{email:string;stripe_customer_id:string|null;stripe_subscription_id:string|null}>();
  if(!user)throw new TuckError(401,'Sign in again.');
  let customerId=user.stripe_customer_id;
  if(!customerId) {
    const customer=await stripe.customers.create({email:user.email,metadata:{userId}}, {idempotencyKey:`family-customer-${userId}`});
    await env.DB.prepare('UPDATE users SET stripe_customer_id=? WHERE id=? AND stripe_customer_id IS NULL').bind(customer.id,userId).run();
    customerId=await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id=?').bind(userId).first<string>('stripe_customer_id');
  }
  if(!customerId)throw new TuckError(503,'Could not prepare billing account.');
  const existing=await stripe.subscriptions.list({customer:customerId,status:'all',limit:100});
  if(user.stripe_subscription_id&&existing.data.some(s=>s.id===user.stripe_subscription_id&&!['canceled','incomplete_expired'].includes(s.status)))throw new TuckError(409,'Your existing recurring plan remains unchanged. Manage it in account settings or contact support before purchasing another subscription.');
  if(existing.has_more||existing.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)&&(s.metadata.plan==='family_premium'||s.items.data.some(i=>i.price.id===price.id))))throw new TuckError(409,'A monthly subscription or payment is already in progress. Manage it in account settings.');
  // Durable attempts reuse one Stripe session, even after an uncertain response.
  await env.DB.prepare(`INSERT INTO parent_checkout_attempts(user_id,attempt_id,expires_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET attempt_id=excluded.attempt_id,expires_at=excluded.expires_at WHERE expires_at<?`).bind(userId,crypto.randomUUID(),now+3600000,now).run();
  const attempt=await env.DB.prepare('SELECT attempt_id,expires_at FROM parent_checkout_attempts WHERE user_id=?').bind(userId).first<{attempt_id:string;expires_at:number}>();
  if(!attempt)throw new TuckError(503,'Could not prepare checkout.');
  const session=await stripe.checkout.sessions.create({customer:customerId,mode:'subscription',line_items:[{price:price.id,quantity:1}],client_reference_id:userId,metadata:{plan:'family_premium',userId},subscription_data:{metadata:{plan:'family_premium',userId}},success_url:`${env.APP_URL}/family?checkout=success`,cancel_url:`${env.APP_URL}/pricing?canceled=true`,expires_at:Math.floor(attempt.expires_at/1000),custom_text:{submit:{message:'$19.99 per month, charged now and renewed monthly until canceled. No free trial. Includes school research while subscribed; your separate Research Pass stays unchanged.'}}},{idempotencyKey:`family-checkout-${attempt.attempt_id}`});
  if(session.status!=='open'||!session.url)throw new TuckError(409,'Checkout already completed or expired. Check your account before trying again.');
  return {url:session.url};
}
