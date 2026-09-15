import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import Stripe from 'stripe';
import {storage} from '../../server/storage';
import {db} from '../../server/db';
import {users,processedWebhookEvents,magicLinkTokens} from '../../shared/schema';
import {eq} from 'drizzle-orm';
import {WebhookHandlers} from '../../server/webhookHandlers';

/** Signed, simulated Stripe events against actual D1. No Stripe API calls,
 * real credentials, payments or outgoing email. Called only by private preview. */
export async function rehearseWebhooks(){
 const tag=`d1-webhook-${crypto.randomUUID()}`,secret=randomBytes(32).toString('hex');
 process.env.ENVIRONMENT='staging';
 process.env.STRIPE_TEST_SECRET_KEY=['sk','test',randomBytes(24).toString('hex')].join('_');
 process.env.STRIPE_TEST_PUBLISHABLE_KEY=['pk','test',randomBytes(24).toString('hex')].join('_');
 process.env.STRIPE_WEBHOOK_SECRET=secret;
 const stripe=new Stripe(process.env.STRIPE_TEST_SECRET_KEY);
 const user=await storage.createUser({email:`${tag}@example.invalid`,password:'synthetic-no-login'});
 const customer=`cus_${tag}`,events:string[]=[],passed:string[]=[];
 let guestId:string|undefined;
 const event=(type:string,object:unknown)=>({id:`evt_${tag}_${events.length}`,object:'event',type,livemode:false,created:Math.floor(Date.now()/1000),data:{object}});
 async function deliver(value:ReturnType<typeof event>){
  const payload=JSON.stringify(value),signature=await stripe.webhooks.generateTestHeaderStringAsync({payload,secret});
  events.push(value.id);await WebhookHandlers.processWebhook(Buffer.from(payload),signature);
 }
 try{
  await storage.updateUserStripeInfo(user.id,{stripeCustomerId:customer});
  const payment=event('checkout.session.completed',{id:`cs_${tag}`,customer,customer_email:user.email,mode:'payment',payment_status:'paid',payment_intent:`pi_${tag}`,metadata:{plan:'season_pass',duration_months:'6'},amount_total:2900});
  const payload=JSON.stringify(payment);
  const invalidSignature=await stripe.webhooks.generateTestHeaderStringAsync({payload,secret:randomBytes(32).toString('hex')});
  await assert.rejects(()=>WebhookHandlers.processWebhook(Buffer.from(payload),invalidSignature));
  assert.equal(await storage.isWebhookEventProcessed(payment.id),false);assert.notEqual((await storage.getUser(user.id))?.subscriptionStatus,'active');passed.push('invalid signature rejected without granting access');
  const expiredSignature=await stripe.webhooks.generateTestHeaderStringAsync({payload,secret,timestamp:Math.floor(Date.now()/1000)-1000});
  await assert.rejects(()=>WebhookHandlers.processWebhook(Buffer.from(payload),expiredSignature));passed.push('expired signature rejected');
  await deliver(payment);const paid=await storage.getUser(user.id);assert.equal(paid?.subscriptionStatus,'active');assert.equal(paid.subscriptionPlan,'season_pass');assert.ok(paid.subscriptionExpiresAt instanceof Date);assert.ok(paid.subscriptionExpiresAt.getTime()>Date.now());passed.push('signed checkout persists season-pass access and expiry');
  await deliver(payment);assert.equal((await storage.getUser(user.id))?.subscriptionExpiresAt?.getTime(),paid.subscriptionExpiresAt.getTime());passed.push('duplicate event does not extend access');
  await deliver(event('customer.subscription.updated',{id:`sub_${tag}`,customer,status:'past_due'}));assert.equal((await storage.getUser(user.id))?.subscriptionStatus,'past_due');passed.push('subscription status update persisted');
  await deliver(event('customer.subscription.deleted',{id:`sub_${tag}`,customer,status:'canceled'}));assert.equal((await storage.getUser(user.id))?.subscriptionStatus,'free');assert.equal((await storage.getUser(user.id))?.stripeSubscriptionId,null);passed.push('subscription deletion persisted');
  const guestEmail=`${tag}-guest@example.invalid`;
  await deliver(event('checkout.session.completed',{id:`cs_guest_${tag}`,customer:`cus_guest_${tag}`,customer_details:{email:guestEmail,name:'Synthetic Guest'},mode:'payment',payment_status:'paid',metadata:{source:'guest_checkout',plan:'season_pass',duration_months:'6'},amount_total:2900}));
  const guest=await storage.getUserByEmail(guestEmail);assert.ok(guest);guestId=guest.id;assert.equal(guest.subscriptionStatus,'active');
  const tokens=await db.select().from(magicLinkTokens).where(eq(magicLinkTokens.userId,guest.id));assert.equal(tokens.length,1);assert.ok(tokens[0].expiresAt instanceof Date);passed.push('guest account and magic-link token created with email delivery disabled');
  return {simulated:true,stripeApiCalls:0,realPayments:0,passed};
 }finally{
  for(const id of new Set(events))await db.delete(processedWebhookEvents).where(eq(processedWebhookEvents.eventId,id));
  await db.delete(users).where(eq(users.id,user.id));
  const guest=guestId?await storage.getUser(guestId):await storage.getUserByEmail(`${tag}-guest@example.invalid`);
  if(guest)await db.delete(users).where(eq(users.id,guest.id));
 }
}
