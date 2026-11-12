import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
// This is a demo store, so only a test key turns card payment on. A live key would take real money
const isTestKey = /^(sk|rk)_test_/.test(secretKey ?? '');
if (secretKey && !isTestKey) {
  console.warn('STRIPE_SECRET_KEY is not a test key, so card payment is off.');
}

// STRIPE_API_URL is only for tests, which point the client at a local stand-in for Stripe
const apiUrl = process.env.STRIPE_API_URL && new URL(process.env.STRIPE_API_URL);

// Without a key, card payment is off and the store works as before
export const stripe = isTestKey
  ? new Stripe(secretKey, apiUrl ? {
    host: apiUrl.hostname,
    port: apiUrl.port,
    protocol: apiUrl.protocol.slice(0, -1)
  } : {})
  : null;
