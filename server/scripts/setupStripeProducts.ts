import Stripe from 'stripe';
import { getUncachableStripeClient } from '../stripeClient';

async function setupStripeProducts() {
  console.log('Getting Stripe client from Replit connector...');
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
      p => p.recurring?.interval === 'month' && p.active && p.unit_amount === 999
    );

    if (existingMonthlyPrice) {
      console.log('Monthly price already exists:', existingMonthlyPrice.id);
    } else {
      // Create monthly price ($9.99/month)
      const monthlyPrice = await stripe.prices.create({
        product: premiumProduct.id,
        unit_amount: 999, // $9.99 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan: 'premium',
          interval: 'month',
        },
      });
      console.log('Created monthly price:', monthlyPrice.id, '($9.99/month)');
    }

    console.log('\nStripe products setup complete!');
    console.log('The stripe-replit-sync will automatically sync these to the database.');
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

setupStripeProducts();
