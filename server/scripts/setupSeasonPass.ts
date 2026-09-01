import Stripe from 'stripe';
import { getUncachableStripeClient } from '../stripeClient';

async function setupSeasonPass() {
  console.log('Getting Stripe client...');
  const stripe = await getUncachableStripeClient();

  console.log('Setting up Season Pass and Developer products...\n');

  try {
    const existingProducts = await stripe.products.list({ limit: 100 });

    // Season Pass Product ($29 one-time for 6 months)
    let seasonPassProduct = existingProducts.data.find(
      p => p.name === 'Season Pass' && p.active
    );

    if (!seasonPassProduct) {
      seasonPassProduct = await stripe.products.create({
        name: 'Season Pass',
        description: 'Full access for 6 months. Unlimited comparisons, detailed score breakdowns, commute calculator, AI assistant, and smart recommendations. Built by a NYC Parent for NYC Parents.',
        metadata: {
          plan: 'season_pass',
          duration_months: '6',
        },
      });
      console.log('Created Season Pass product:', seasonPassProduct.id);
    } else {
      console.log('Season Pass product already exists:', seasonPassProduct.id);
    }

    // Check/create Season Pass price ($29 one-time)
    const seasonPassPrices = await stripe.prices.list({
      product: seasonPassProduct.id,
      limit: 100,
    });
    
    let seasonPassPrice = seasonPassPrices.data.find(
      p => p.unit_amount === 2900 && !p.recurring && p.active
    );

    if (!seasonPassPrice) {
      seasonPassPrice = await stripe.prices.create({
        product: seasonPassProduct.id,
        unit_amount: 2900, // $29
        currency: 'usd',
        metadata: {
          plan: 'season_pass',
          duration_months: '6',
        },
      });
      console.log('Created Season Pass price:', seasonPassPrice.id, '($29 one-time)');
    } else {
      console.log('Season Pass price already exists:', seasonPassPrice.id);
    }

    // Developer/API Plan Product ($19/month)
    let developerProduct = existingProducts.data.find(
      p => p.name === 'Developer API' && p.active
    );

    if (!developerProduct) {
      developerProduct = await stripe.products.create({
        name: 'Developer API',
        description: 'API access for developers and analysts. Programmatic access to NYC school data, bulk exports, and advanced analytics endpoints.',
        metadata: {
          plan: 'developer',
        },
      });
      console.log('Created Developer API product:', developerProduct.id);
    } else {
      console.log('Developer API product already exists:', developerProduct.id);
    }

    // Check/create Developer price ($19/month)
    const developerPrices = await stripe.prices.list({
      product: developerProduct.id,
      limit: 100,
    });
    
    let developerMonthlyPrice = developerPrices.data.find(
      p => p.recurring?.interval === 'month' && p.active && p.unit_amount === 1900
    );

    if (!developerMonthlyPrice) {
      developerMonthlyPrice = await stripe.prices.create({
        product: developerProduct.id,
        unit_amount: 1900, // $19
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan: 'developer',
          interval: 'month',
        },
      });
      console.log('Created Developer monthly price:', developerMonthlyPrice.id, '($19/month)');
    } else {
      console.log('Developer monthly price already exists:', developerMonthlyPrice.id);
    }

    console.log('\n✅ Stripe products setup complete!');
    console.log('\nProducts created:');
    console.log(`  - Season Pass: ${seasonPassProduct.id} @ $29 one-time (6 months access)`);
    console.log(`  - Developer API: ${developerProduct.id} @ $19/month`);
    console.log('\nThe application reads these products directly from Stripe.');
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

setupSeasonPass();
