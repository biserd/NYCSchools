import Stripe from 'stripe';
import { getUncachableStripeClient } from '../stripeClient';

async function setupStripeProducts() {
  console.log('Getting Stripe client...');
  const stripe = await getUncachableStripeClient();

  console.log('Setting up Stripe products and prices...\n');

  try {
    // Check if Premium product already exists
    const existingProducts = await stripe.products.list({ limit: 100 });
    const existingPremium = existingProducts.data.find(
      p => p.name === 'Premium' && p.active
    );

    let premiumProduct: Stripe.Product;

    if (existingPremium) {
      console.log('Premium product already exists:', existingPremium.id);
      premiumProduct = existingPremium;
    } else {
      // Create Premium product
      premiumProduct = await stripe.products.create({
        name: 'Premium',
        description: 'Unlimited AI questions, commute calculator, smart recommendations, early childhood AI insights, historical trend analysis, and priority support.',
        metadata: {
          plan: 'premium',
        },
      });
      console.log('Created Premium product:', premiumProduct.id);
    }

    // Check if monthly price already exists
    const existingPrices = await stripe.prices.list({
      product: premiumProduct.id,
      limit: 100,
    });
    
    const existingMonthlyPrice = existingPrices.data.find(
      p => p.recurring?.interval === 'month' && p.active && p.unit_amount === 499
    );

    // Archive any old monthly prices that are not $4.99
    const oldMonthlyPrices = existingPrices.data.filter(
      p => p.recurring?.interval === 'month' && p.active && p.unit_amount !== 499
    );
    
    for (const oldPrice of oldMonthlyPrices) {
      await stripe.prices.update(oldPrice.id, { active: false });
      console.log(`Archived old price: ${oldPrice.id} ($${(oldPrice.unit_amount || 0) / 100}/month)`);
    }

    if (existingMonthlyPrice) {
      console.log('Monthly price already exists:', existingMonthlyPrice.id);
    } else {
      // Create monthly price ($4.99/month)
      const monthlyPrice = await stripe.prices.create({
        product: premiumProduct.id,
        unit_amount: 499, // $4.99 in cents
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

    console.log('\nStripe products setup complete!');
    console.log('The application reads these products directly from Stripe.');
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

setupStripeProducts();
