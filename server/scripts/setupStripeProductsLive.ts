import Stripe from 'stripe';

async function setupStripeProductsLive() {
  const secretKey = process.env.STRIPE_LIVE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('Error: STRIPE_LIVE_SECRET_KEY environment variable not set');
    console.error('Please add your live Stripe secret key to the secrets.');
    process.exit(1);
  }
  
  console.log('Connecting to Stripe LIVE account...');
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });

  console.log('Setting up Premium and Season Pass products in LIVE Stripe...\n');

  try {
    const existingProducts = await stripe.products.list({ limit: 100 });
    
    // === PREMIUM MONTHLY SUBSCRIPTION ===
    const existingPremium = existingProducts.data.find(
      p => p.name === 'Premium' && p.active
    );

    let premiumProduct: Stripe.Product;

    if (existingPremium) {
      console.log('Premium product already exists:', existingPremium.id);
      premiumProduct = existingPremium;
    } else {
      premiumProduct = await stripe.products.create({
        name: 'Premium',
        description: 'Unlimited AI questions, commute calculator, smart recommendations, early childhood AI insights, historical trend analysis, and priority support.',
        metadata: {
          plan: 'premium',
        },
      });
      console.log('Created Premium product:', premiumProduct.id);
    }

    const existingPrices = await stripe.prices.list({
      product: premiumProduct.id,
      limit: 100,
    });
    
    const existingMonthlyPrice = existingPrices.data.find(
      p => p.recurring?.interval === 'month' && p.active && p.unit_amount === 499
    );

    const oldMonthlyPrices = existingPrices.data.filter(
      p => p.recurring?.interval === 'month' && p.active && p.unit_amount !== 499
    );
    
    for (const oldPrice of oldMonthlyPrices) {
      await stripe.prices.update(oldPrice.id, { active: false });
      console.log(`Archived old price: ${oldPrice.id} ($${(oldPrice.unit_amount || 0) / 100}/month)`);
    }

    let monthlyPriceId = existingMonthlyPrice?.id;
    if (existingMonthlyPrice) {
      console.log('Monthly price ($4.99) already exists:', existingMonthlyPrice.id);
    } else {
      const monthlyPrice = await stripe.prices.create({
        product: premiumProduct.id,
        unit_amount: 499,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan: 'premium',
          interval: 'month',
        },
      });
      monthlyPriceId = monthlyPrice.id;
      console.log('Created monthly price:', monthlyPrice.id, '($4.99/month)');
    }

    // === SEASON PASS ONE-TIME ===
    console.log('\n--- Setting up Season Pass ---');
    
    const existingSeasonPass = existingProducts.data.find(
      p => p.name === 'Season Pass' && p.active
    );

    let seasonPassProduct: Stripe.Product;

    if (existingSeasonPass) {
      console.log('Season Pass product already exists:', existingSeasonPass.id);
      seasonPassProduct = existingSeasonPass;
    } else {
      seasonPassProduct = await stripe.products.create({
        name: 'Season Pass',
        description: 'Full access for 6 months. Unlimited comparisons, detailed score breakdowns, commute calculator, AI assistant, and smart recommendations. Built by a NYC Parent for NYC Parents.',
        metadata: {
          plan: 'season_pass',
          duration_months: '6',
        },
      });
      console.log('Created Season Pass product:', seasonPassProduct.id);
    }

    const seasonPassPrices = await stripe.prices.list({
      product: seasonPassProduct.id,
      limit: 100,
    });
    
    const existingSeasonPassPrice = seasonPassPrices.data.find(
      p => p.unit_amount === 2900 && !p.recurring && p.active
    );

    let seasonPassPriceId = existingSeasonPassPrice?.id;
    if (existingSeasonPassPrice) {
      console.log('Season Pass price ($29) already exists:', existingSeasonPassPrice.id);
    } else {
      const seasonPassPrice = await stripe.prices.create({
        product: seasonPassProduct.id,
        unit_amount: 2900,
        currency: 'usd',
        metadata: {
          plan: 'season_pass',
          duration_months: '6',
        },
      });
      seasonPassPriceId = seasonPassPrice.id;
      console.log('Created Season Pass price:', seasonPassPrice.id, '($29 one-time)');
    }

    console.log('\n✅ LIVE Stripe products setup complete!');
    console.log('\n=== IMPORTANT: Update these IDs in server/routes.ts ===');
    console.log(`Premium Product ID: ${premiumProduct.id}`);
    console.log(`Premium Monthly Price ID: ${monthlyPriceId}`);
    console.log(`Season Pass Product ID: ${seasonPassProduct.id}`);
    console.log(`Season Pass Price ID: ${seasonPassPriceId}`);
    console.log('\nCopy the Season Pass IDs to the liveProducts array in routes.ts!');
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

setupStripeProductsLive();
