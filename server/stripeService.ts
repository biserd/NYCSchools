// Stripe service for NYC School Ratings - handles Stripe API operations
import { getSeasonPassStripeConfiguration, getUncachableStripeClient } from './stripeClient';
import type Stripe from 'stripe';

interface ProductWithPriceRow {
  product_id: string;
  product_name: string;
  product_description: string | null;
  product_active: boolean;
  product_metadata: Stripe.Metadata;
  price_id: string | null;
  unit_amount: number | null;
  currency: string | null;
  recurring: Stripe.Price.Recurring | null;
  price_active: boolean | null;
  price_metadata: Stripe.Metadata | null;
}

export class StripeService {
  getSeasonPassPriceId(): string {
    return getSeasonPassStripeConfiguration().priceId;
  }

  async getSeasonPassOffer() {
    const { productId, priceId } = getSeasonPassStripeConfiguration();
    const stripe = await getUncachableStripeClient();
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const actualProductId = typeof price.product === 'string'
      ? price.product
      : price.product.id;

    if (actualProductId !== productId) {
      throw new Error(`Configured Season Pass price belongs to ${actualProductId}, not ${productId}`);
    }
    if (!price.active || price.recurring !== null || price.type !== 'one_time') {
      throw new Error('Configured Season Pass price must be an active one-time price');
    }
    if (price.currency !== 'usd' || price.unit_amount !== 2900) {
      throw new Error('Configured Season Pass price must be exactly $29.00 USD');
    }

    const product = typeof price.product === 'string'
      ? await stripe.products.retrieve(price.product)
      : price.product;
    if ('deleted' in product && product.deleted) {
      throw new Error('Configured Season Pass product has been deleted');
    }
    if (!product.active) {
      throw new Error('Configured Season Pass product is inactive');
    }

    return { product, price };
  }

  async createCustomer(email: string, userId: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async createCheckoutSession(
    customerId: string, 
    priceId: string, 
    successUrl: string, 
    cancelUrl: string,
    userId: string,
    mode: 'subscription' | 'payment' = 'subscription'
  ) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });
  }

  async createSeasonPassCheckout(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    userId: string
  ) {
    return this.createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      userId,
      'payment'
    );
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const stripe = await getUncachableStripeClient();
    return stripe.products.retrieve(productId);
  }

  async listProducts(active = true, limit = 20, offset = 0) {
    const stripe = await getUncachableStripeClient();
    const result = await stripe.products.list({ active, limit: Math.min(100, limit + offset) });
    return result.data.slice(offset, offset + limit);
  }

  async listProductsWithPrices(active = true, limit = 20, offset = 0) {
    const stripe = await getUncachableStripeClient();
    const [productList, priceList] = await Promise.all([
      stripe.products.list({ active, limit: Math.min(100, limit + offset) }),
      stripe.prices.list({ active, limit: 100 }),
    ]);
    const products = productList.data.slice(offset, offset + limit);

    return products.flatMap<ProductWithPriceRow>((product) => {
      const productPrices = priceList.data.filter((price) =>
        (typeof price.product === 'string' ? price.product : price.product.id) === product.id,
      );
      if (productPrices.length === 0) {
        return [{
          product_id: product.id,
          product_name: product.name,
          product_description: product.description,
          product_active: product.active,
          product_metadata: product.metadata,
          price_id: null,
          unit_amount: null,
          currency: null,
          recurring: null,
          price_active: null,
          price_metadata: null,
        }];
      }
      return productPrices.map((price) => ({
        product_id: product.id,
        product_name: product.name,
        product_description: product.description,
        product_active: product.active,
        product_metadata: product.metadata,
        price_id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        price_active: price.active,
        price_metadata: price.metadata,
      }));
    });
  }

  async getPrice(priceId: string) {
    const stripe = await getUncachableStripeClient();
    return stripe.prices.retrieve(priceId);
  }

  async listPrices(active = true, limit = 20, offset = 0) {
    const stripe = await getUncachableStripeClient();
    const result = await stripe.prices.list({ active, limit: Math.min(100, limit + offset) });
    return result.data.slice(offset, offset + limit);
  }

  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  async getSubscriptionWithDetails(subscriptionId: string) {
    const stripe = await this.getStripe();
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      return subscription;
    } catch (error) {
      console.error('Error fetching subscription from Stripe:', error);
      return null;
    }
  }

  private async getStripe() {
    return await getUncachableStripeClient();
  }

  async getCustomerSubscriptions(customerId: string) {
    const stripe = await getUncachableStripeClient();
    const result = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
    return result.data;
  }
}

export const stripeService = new StripeService();
