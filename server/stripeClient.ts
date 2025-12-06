// Stripe client for NYC School Ratings - handles Replit Stripe connector with manual key fallback
// Note: Production uses manual STRIPE_LIVE_* keys since Stripe connector is only set up for Sandbox
import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';
  
  console.log(`Getting Stripe credentials for ${targetEnvironment} environment`);
  
  // For production, use manual STRIPE_LIVE_* keys since Replit Stripe connector is only for Sandbox
  if (isProduction) {
    const publishableKey = process.env.STRIPE_LIVE_PUBLISHABLE_KEY;
    const secretKey = process.env.STRIPE_LIVE_SECRET_KEY;
    
    if (!publishableKey || !secretKey) {
      console.error('Production Stripe keys missing. Please set STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY secrets.');
      throw new Error('Production Stripe credentials not configured. Please add STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY to secrets.');
    }
    
    console.log('Stripe production credentials loaded from manual secrets');
    cachedCredentials = { publishableKey, secretKey };
    return cachedCredentials;
  }
  
  // For development, use the Replit Stripe connector (Sandbox mode)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    console.error('Stripe credentials error: No authentication token available');
    console.error('REPL_IDENTITY:', !!process.env.REPL_IDENTITY);
    console.error('WEB_REPL_RENEWAL:', !!process.env.WEB_REPL_RENEWAL);
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  if (!hostname) {
    console.error('Stripe credentials error: REPLIT_CONNECTORS_HOSTNAME not set');
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not available');
  }

  const connectorName = 'stripe';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  console.log('Fetching Stripe connection from:', url.toString().replace(/\?.*/, '?...'));
  
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  if (!response.ok) {
    console.error('Stripe connector response error:', response.status, response.statusText);
    throw new Error(`Stripe connector request failed: ${response.status}`);
  }

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings?.publishable || !connectionSettings.settings?.secret)) {
    console.error('Stripe connection settings missing:', {
      hasConnection: !!connectionSettings,
      hasSettings: !!connectionSettings?.settings,
      hasPublishable: !!connectionSettings?.settings?.publishable,
      hasSecret: !!connectionSettings?.settings?.secret,
      targetEnvironment
    });
    throw new Error(`Stripe ${targetEnvironment} connection not configured. Please set up Stripe in the Replit connector.`);
  }

  console.log(`Stripe ${targetEnvironment} credentials loaded successfully`);
  
  cachedCredentials = {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
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
