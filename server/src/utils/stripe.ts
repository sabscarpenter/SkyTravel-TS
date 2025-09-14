import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function isStripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim());
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error('Stripe not configured: missing STRIPE_SECRET_KEY');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeInstance;
}
