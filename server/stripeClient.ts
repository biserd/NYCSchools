// Stripe client for NYC School Ratings - handles test vs live keys based on environment
// Production: Uses STRIPE_LIVE_* keys
// Development: Uses STRIPE_TEST_* keys for safe testing without affecting production
import Stripe from 'stripe';

let cachedCredentials: { publishableKey: string; secretKey: string; mode: 'test' | 'live' } | null = null;

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  
  if (isProduction) {
    // Production: Use LIVE keys
    const publishableKey = process.env.STRIPE_LIVE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_LIVE_SECRET_KEY;
    
    if (!publishableKey || !secretKey) {
      console.error('Production Stripe keys missing. Please set STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY secrets.');
      throw new Error('Production Stripe credentials not configured. Please add STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY to secrets.');
    }
    
    console.log('Stripe LIVE mode credentials loaded for production');
    cachedCredentials = { publishableKey, secretKey, mode: 'live' };
    return cachedCredentials;
  }
  
  // Development: Use TEST keys for safe testing
  const publishableKey = process.env.STRIPE_TEST_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
  
  if (!publishableKey || !secretKey) {
    console.error('Development Stripe test keys missing.');
    console.error('To test Stripe payments in development:');
    console.error('1. Go to Stripe Dashboard → Toggle to "Test Mode"');
    console.error('2. Go to Developers → API Keys');
    console.error('3. Add STRIPE_TEST_PUBLISHABLE_KEY and STRIPE_TEST_SECRET_KEY to secrets');
    throw new Error('Stripe test credentials not configured. Please add STRIPE_TEST_PUBLISHABLE_KEY and STRIPE_TEST_SECRET_KEY to secrets for development testing.');
  }
  
  console.log('Stripe TEST mode credentials loaded for development');
  cachedCredentials = { publishableKey, secretKey, mode: 'test' };
  return cachedCredentials;
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

export async function getStripeMode(): Promise<'test' | 'live'> {
  const { mode } = await getCredentials();
  return mode;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
