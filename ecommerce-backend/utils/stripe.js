import Stripe from 'stripe';

// STRIPE_API_URL is only for tests, which point the client at a local stand-in for Stripe
const apiUrl = process.env.STRIPE_API_URL && new URL(process.env.STRIPE_API_URL);

// Without a key, card payment is off and the store works as before
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, apiUrl ? {
    host: apiUrl.hostname,
    port: apiUrl.port,
    protocol: apiUrl.protocol.slice(0, -1)
  } : {})
  : null;
