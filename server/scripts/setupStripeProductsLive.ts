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

  console.log('Setting up Premium product and price in LIVE Stripe...\n');

  try {
    const existingProducts = await stripe.products.list({ limit: 100 });
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
      console.log('Created monthly price:', monthlyPrice.id, '($4.99/month)');
    }

    console.log('\n✅ LIVE Stripe products setup complete!');
    console.log('Premium subscription at $4.99/month is now available in your live Stripe account.');
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

setupStripeProductsLive();
