// Stripe webhook handlers for NYC School Ratings
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { sendAdminNewCustomerNotification, sendWelcomeEmail } from './emailService';
import Stripe from 'stripe';

// Enhanced logging for webhook debugging
function logWebhook(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[STRIPE_WEBHOOK ${level}] ${timestamp}`;
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    logWebhook('INFO', `Webhook received - UUID: ${uuid}, Payload size: ${payload?.length || 0} bytes`);
    
    if (!Buffer.isBuffer(payload)) {
      logWebhook('ERROR', 'Payload is not a Buffer', { type: typeof payload });
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // Let stripe-replit-sync process the webhook first (syncs to its tables)
    logWebhook('INFO', 'Processing webhook with stripe-replit-sync...');
    await sync.processWebhook(payload, signature, uuid);
    logWebhook('INFO', 'stripe-replit-sync processing complete');
    
    // Now handle custom logic for subscription updates
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = await sync.getWebhookSecret(uuid);
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      logWebhook('INFO', `Event constructed successfully`, { 
        eventId: event.id, 
        eventType: event.type,
        livemode: event.livemode 
      });
      
      await WebhookHandlers.handleSubscriptionEvents(event);
    } catch (err: any) {
      logWebhook('ERROR', 'Error in custom webhook handling', { 
        error: err.message,
        stack: err.stack 
      });
      // Don't throw - the sync already processed successfully
    }
  }
  
  static async handleSubscriptionEvents(event: Stripe.Event): Promise<void> {
    const eventType = event.type;
    logWebhook('INFO', `Handling event type: ${eventType}`);
    
    // Handle subscription lifecycle events
    if (eventType === 'customer.subscription.created' || 
        eventType === 'customer.subscription.updated' ||
        eventType === 'customer.subscription.deleted') {
      
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;
      
      logWebhook('INFO', `Processing subscription event`, {
        eventType,
        customerId,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status
      });
      
      // Find user by Stripe customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      
      if (!user) {
        logWebhook('WARN', `No user found for Stripe customer`, { customerId });
        return;
      }
      
      logWebhook('INFO', `Found user for customer`, { 
        userId: user.id, 
        email: user.email,
        customerId 
      });
      
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
      logWebhook('INFO', `Updating user subscription`, {
        userId: user.id,
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionPlan
      });
      
      await storage.updateUserStripeInfo(user.id, {
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionPlan,
      });
      
      logWebhook('INFO', `Successfully updated user subscription`, {
        userId: user.id,
        status: subscriptionStatus,
        plan: subscriptionPlan
      });
    }
    
    // Handle checkout session completed
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const customerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer?.id;
      
      logWebhook('INFO', `Processing checkout.session.completed`, {
        sessionId: session.id,
        customerId,
        mode: session.mode,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        metadata: session.metadata
      });
      
      if (!customerId) {
        logWebhook('WARN', `No customer ID in checkout session`, { sessionId: session.id });
        return;
      }
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        logWebhook('WARN', `No user found for Stripe customer in checkout`, { customerId });
        return;
      }
      
      logWebhook('INFO', `Found user for checkout session`, {
        userId: user.id,
        email: user.email,
        currentStatus: user.subscriptionStatus,
        currentPlan: user.subscriptionPlan
      });
      
      if (session.mode === 'subscription' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
        
        logWebhook('INFO', `Processing subscription checkout`, {
          customerId,
          subscriptionId
        });
        
        await storage.updateUserStripeInfo(user.id, {
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          subscriptionPlan: 'premium',
        });
        
        logWebhook('INFO', `Successfully updated user via subscription checkout`, {
          userId: user.id,
          subscriptionId
        });
      } else if (session.mode === 'payment') {
        // One-time payment (Season Pass)
        logWebhook('INFO', `Processing one-time payment (Season Pass)`, {
          customerId,
          paymentIntent: session.payment_intent,
          metadata: session.metadata
        });
        
        // Check metadata for plan type
        const planType = session.metadata?.plan || 'season_pass';
        const durationMonths = parseInt(session.metadata?.duration_months || '6', 10);
        
        // Calculate expiration date (6 months from now for Season Pass)
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
        
        logWebhook('INFO', `Updating user with Season Pass`, {
          userId: user.id,
          planType,
          durationMonths,
          expiresAt: expiresAt.toISOString()
        });
        
        await storage.updateUserStripeInfo(user.id, {
          stripeSubscriptionId: session.payment_intent as string | null,
          subscriptionStatus: 'active',
          subscriptionPlan: planType,
          subscriptionExpiresAt: expiresAt,
        });
        
        logWebhook('INFO', `Successfully updated user with Season Pass`, {
          userId: user.id,
          planType,
          expiresAt: expiresAt.toISOString()
        });
        
        // Send welcome email to customer and admin notification
        if (user.email) {
          logWebhook('INFO', `Sending emails for new Season Pass customer`, { email: user.email });
          
          // Extract first name from user profile if available
          const firstName = user.firstName || undefined;
          
          // Send both emails in parallel
          const [welcomeResult, adminResult] = await Promise.all([
            sendWelcomeEmail(user.email, firstName),
            sendAdminNewCustomerNotification(user.email, planType, session.amount_total || undefined)
          ]);
          
          logWebhook('INFO', `Email sending completed`, { 
            welcomeEmailSent: welcomeResult, 
            adminNotificationSent: adminResult,
            email: user.email
          });
        } else {
          logWebhook('WARN', `No email available for user, skipping email notifications`, { userId: user.id });
        }
      } else {
        logWebhook('WARN', `Unknown checkout session mode`, {
          mode: session.mode,
          sessionId: session.id
        });
      }
    }
  }
}
