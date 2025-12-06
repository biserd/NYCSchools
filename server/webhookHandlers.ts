// Stripe webhook handlers for NYC School Ratings
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // Let stripe-replit-sync process the webhook first (syncs to its tables)
    await sync.processWebhook(payload, signature, uuid);
    
    // Now handle custom logic for subscription updates
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = await sync.getWebhookSecret(uuid);
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      await WebhookHandlers.handleSubscriptionEvents(event);
    } catch (err) {
      console.error('Error in custom webhook handling:', err);
      // Don't throw - the sync already processed successfully
    }
  }
  
  static async handleSubscriptionEvents(event: Stripe.Event): Promise<void> {
    const eventType = event.type;
    
    // Handle subscription lifecycle events
    if (eventType === 'customer.subscription.created' || 
        eventType === 'customer.subscription.updated' ||
        eventType === 'customer.subscription.deleted') {
      
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;
      
      console.log(`Processing ${eventType} for customer ${customerId}, subscription ${subscription.id}`);
      
      // Find user by Stripe customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.log(`No user found for Stripe customer ${customerId}`);
        return;
      }
      
      // Determine subscription status and plan
      let subscriptionStatus = 'free';
      let subscriptionPlan = 'free';
      let stripeSubscriptionId: string | null = null;
      
      if (eventType === 'customer.subscription.deleted') {
        // Subscription canceled/deleted - revert to free
        subscriptionStatus = 'free';
        subscriptionPlan = 'free';
        stripeSubscriptionId = null;
      } else if (['active', 'trialing'].includes(subscription.status)) {
        // Active subscription
        subscriptionStatus = 'active';
        subscriptionPlan = 'premium';
        stripeSubscriptionId = subscription.id;
      } else if (subscription.status === 'past_due') {
        // Past due but still active
        subscriptionStatus = 'past_due';
        subscriptionPlan = 'premium';
        stripeSubscriptionId = subscription.id;
      } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
        // Inactive subscription
        subscriptionStatus = 'free';
        subscriptionPlan = 'free';
        stripeSubscriptionId = null;
      }
      
      // Update user subscription info
      await storage.updateUserStripeInfo(user.id, {
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionPlan,
      });
      
      console.log(`Updated user ${user.id} subscription: status=${subscriptionStatus}, plan=${subscriptionPlan}`);
    }
    
    // Handle checkout session completed (backup for subscription creation)
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === 'subscription' && session.subscription) {
        const customerId = typeof session.customer === 'string' 
          ? session.customer 
          : session.customer?.id;
        
        if (!customerId) return;
        
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
        
        console.log(`Checkout completed for customer ${customerId}, subscription ${subscriptionId}`);
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        
        if (user) {
          await storage.updateUserStripeInfo(user.id, {
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
            subscriptionPlan: 'premium',
          });
          
          console.log(`Updated user ${user.id} via checkout.session.completed`);
        }
      }
    }
  }
}
