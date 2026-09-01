// Stripe webhook handlers for NYC School Ratings
import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { sendAdminNewCustomerNotification, sendWelcomeEmail, sendMagicLinkEmail } from './emailService';
import { invalidateUserCaches } from './cache';
import Stripe from 'stripe';
import crypto from 'crypto';
import { getAppUrl } from './runtimeConfig';

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
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    logWebhook('INFO', `Webhook received - Payload size: ${payload?.length || 0} bytes`);
    
    if (!Buffer.isBuffer(payload)) {
      logWebhook('ERROR', 'Payload is not a Buffer', { type: typeof payload });
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

    const stripe = await getUncachableStripeClient();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);

    try {
      logWebhook('INFO', `Parsed event for custom handling`, { 
        eventId: event.id, 
        eventType: event.type,
        livemode: event.livemode 
      });
      
      // Idempotency check - skip if already processed
      const alreadyProcessed = await storage.isWebhookEventProcessed(event.id);
      if (alreadyProcessed) {
        logWebhook('INFO', `Event already processed, skipping`, { eventId: event.id });
        return;
      }
      
      await WebhookHandlers.handleSubscriptionEvents(event);
      
      // Mark event as processed for idempotency
      await storage.markWebhookEventProcessed(event.id, event.type);
    } catch (err: any) {
      logWebhook('ERROR', 'Error in custom webhook handling', { 
        error: err.message,
        stack: err.stack 
      });
      throw err;
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
      
      // Invalidate cached premium/subscription status for immediate effect
      invalidateUserCaches(user.id);
      
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
      
      // Get customer email and name from session (critical for guest checkout)
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || '';
      const isGuestCheckout = session.metadata?.source === 'guest_checkout';
      
      // Parse customer name into first and last name
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || undefined;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
      
      logWebhook('INFO', `Processing checkout.session.completed`, {
        sessionId: session.id,
        customerId,
        customerEmail,
        isGuestCheckout,
        mode: session.mode,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        metadata: session.metadata
      });
      
      if (!customerId) {
        logWebhook('WARN', `No customer ID in checkout session`, { sessionId: session.id });
        return;
      }
      
      // Try to find existing user by Stripe customer ID first
      let user = await storage.getUserByStripeCustomerId(customerId);
      
      // If no user found and we have an email, check by email or create new user
      if (!user && customerEmail) {
        // Check if user exists by email
        user = await storage.getUserByEmail(customerEmail.toLowerCase());
        
        if (user) {
          // User exists by email - link Stripe customer ID
          logWebhook('INFO', `Found existing user by email, linking Stripe customer`, {
            userId: user.id,
            email: customerEmail,
            customerId
          });
          await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customerId });
        } else if (isGuestCheckout) {
          // Guest checkout - create new user with name from Stripe
          logWebhook('INFO', `Creating new user for guest checkout`, {
            email: customerEmail,
            customerId,
            firstName,
            lastName
          });
          user = await storage.createGuestUser(customerEmail, customerId, firstName, lastName);
          logWebhook('INFO', `Created new guest user`, {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          });
        }
      }
      
      if (!user) {
        logWebhook('WARN', `No user found or created for checkout session`, { 
          customerId,
          customerEmail,
          isGuestCheckout
        });
        return;
      }
      
      logWebhook('INFO', `Found/created user for checkout session`, {
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
        
        // Invalidate cached premium/subscription status for immediate effect
        invalidateUserCaches(user.id);
        
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
        
        // Invalidate cached premium/subscription status for immediate effect
        invalidateUserCaches(user.id);
        
        logWebhook('INFO', `Successfully updated user with Season Pass`, {
          userId: user.id,
          planType,
          expiresAt: expiresAt.toISOString()
        });
        
        // Send appropriate emails based on checkout type
        if (user.email) {
          logWebhook('INFO', `Sending emails for new Season Pass customer`, { 
            email: user.email,
            isGuestCheckout 
          });
          
          const firstName = user.firstName || undefined;
          
          if (isGuestCheckout) {
            // Guest checkout - send magic link email instead of regular welcome
            // Generate magic link token (24-hour expiration for initial access)
            const magicToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(magicToken).digest('hex');
            const magicLinkExpiry = new Date();
            magicLinkExpiry.setHours(magicLinkExpiry.getHours() + 24);
            
            await storage.createMagicLinkToken(user.id, tokenHash, magicLinkExpiry);
            
            const baseUrl = getAppUrl();
            const magicLinkUrl = `${baseUrl}/auth/magic-link/${magicToken}`;
            
            logWebhook('INFO', `Generated magic link for guest user`, { 
              userId: user.id,
              email: user.email,
              expiresAt: magicLinkExpiry.toISOString()
            });
            
            // Send magic link email and admin notification
            const [magicResult, adminResult] = await Promise.all([
              sendMagicLinkEmail(user.email, magicLinkUrl, firstName),
              sendAdminNewCustomerNotification(user.email, planType, session.amount_total || undefined)
            ]);
            
            logWebhook('INFO', `Email sending completed (guest checkout)`, { 
              magicLinkEmailSent: magicResult, 
              adminNotificationSent: adminResult,
              email: user.email
            });
          } else {
            // Regular checkout - send normal welcome email
            const [welcomeResult, adminResult] = await Promise.all([
              sendWelcomeEmail(user.email, firstName),
              sendAdminNewCustomerNotification(user.email, planType, session.amount_total || undefined)
            ]);
            
            logWebhook('INFO', `Email sending completed`, { 
              welcomeEmailSent: welcomeResult, 
              adminNotificationSent: adminResult,
              email: user.email
            });
          }
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
