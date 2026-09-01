// Stripe client for NYC School Ratings - handles test vs live keys based on environment
// Production: Uses STRIPE_LIVE_* keys
// Development: Uses STRIPE_TEST_* keys for safe testing without affecting production
import Stripe from 'stripe';

let cachedCredentials: { publishableKey: string; secretKey: string; mode: 'test' | 'live' } | null = null;

export interface SeasonPassStripeConfiguration {
  productId: string;
  priceId: string;
}

function requireStripeResourceId(
  variableName: string,
  expectedPrefix: 'prod_' | 'price_',
): string {
  const value = process.env[variableName];
  if (!value) {
    throw new Error(`${variableName} is not configured`);
  }
  if (!value.startsWith(expectedPrefix)) {
    throw new Error(`${variableName} must start with ${expectedPrefix}`);
  }
  return value;
}

export function getSeasonPassStripeConfiguration(): SeasonPassStripeConfiguration {
  return {
    productId: requireStripeResourceId('STRIPE_SEASON_PASS_PRODUCT_ID', 'prod_'),
    priceId: requireStripeResourceId('STRIPE_SEASON_PASS_PRICE_ID', 'price_'),
  };
}

function assertStripeKeyPrefix(
  variableName: string,
  value: string,
  expectedPrefix: string,
): void {
  if (!value.startsWith(expectedPrefix)) {
    throw new Error(`${variableName} must start with ${expectedPrefix}`);
  }
}

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const isProduction = process.env.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Use LIVE keys
    const publishableKey = process.env.STRIPE_LIVE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_LIVE_SECRET_KEY;
    
    if (!publishableKey || !secretKey) {
      console.error('Production Stripe keys missing. Please set STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY secrets.');
      throw new Error('Production Stripe credentials not configured. Please add STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY to secrets.');
    }

    assertStripeKeyPrefix('STRIPE_LIVE_PUBLISHABLE_KEY', publishableKey, 'pk_live_');
    assertStripeKeyPrefix('STRIPE_LIVE_SECRET_KEY', secretKey, 'sk_live_');
    
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

  assertStripeKeyPrefix('STRIPE_TEST_PUBLISHABLE_KEY', publishableKey, 'pk_test_');
  assertStripeKeyPrefix('STRIPE_TEST_SECRET_KEY', secretKey, 'sk_test_');
  
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
