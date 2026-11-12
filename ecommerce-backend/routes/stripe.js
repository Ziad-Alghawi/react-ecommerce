import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireVisitor } from '../middleware/visitor.js';
import { CartItem } from '../models/CartItem.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { calculatePaymentSummary } from './paymentSummary.js';
import { createOrder, getOrderRefusal } from './orders.js';
import { corsOrigins } from '../utils/corsOrigins.js';
import { stripe } from '../utils/stripe.js';

// The Stripe sandbox is shared with another app, so this store tags its sessions and skips the rest
const APP_TAG = 'react-ecommerce';

const router = express.Router();

router.param('sessionId', (req, res, next, id) => (
  /^cs_\w+$/.test(id) ? next() : res.status(404).json({ error: 'Payment not found' })
));

function lineItem(name, unitAmountCents, quantity = 1, metadata = undefined) {
  return {
    price_data: { currency: 'usd', unit_amount: unitAmountCents, product_data: { name, metadata } },
    quantity
  };
}

// Stripe sends the customer back to the store they came from, so it has to be one of ours
function isStoreOrigin(req, origin) {
  return corsOrigins.includes(origin) || URL.parse(origin)?.host === req.get('host');
}

// The webhook and the success page both get here for the same payment, maybe at the same
// time. The unique session ID lets only one of them create the order, and only it clears the cart
async function fulfillCheckout(session) {
  const findOrder = () => Order.findOne({ where: { stripeSessionId: session.id } });
  const existingOrder = await findOrder();
  if (existingOrder) {
    return existingOrder;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product']
  });
  const items = lineItems.data
    .filter((line) => line.price.product.metadata.productId)
    .map((line) => ({ ...line.price.product.metadata, quantity: line.quantity }));
  const { visitorId } = session.metadata;

  let order;
  try {
    order = await createOrder(visitorId, items, {
      totalCostCents: session.amount_total,
      paymentMethod: 'card',
      stripeSessionId: session.id
    });
  } catch (error) {
    const orderFromOtherPath = await findOrder();
    if (orderFromOtherPath) {
      return orderFromOtherPath;
    }
    throw error;
  }

  await CartItem.destroy({ where: { visitorId } });
  return order;
}

export function requireStripe(req, res, next) {
  if (!stripe) {
    return res.status(404).json({ error: 'Card payment is not available' });
  }
  next();
}

router.get('/config', (req, res) => {
  res.json({ cardPayment: Boolean(stripe) });
});

router.use(requireStripe);

router.post('/checkout-sessions', requireVisitor, asyncHandler(async (req, res) => {
  const origin = req.get('Origin');
  if (!isStoreOrigin(req, origin)) {
    return res.status(400).json({ error: 'Card payment only works from the store' });
  }

  const cartItems = await CartItem.findAll({ where: { visitorId: req.visitorId } });
  const refusal = await getOrderRefusal(req.visitorId, cartItems);
  if (refusal) {
    return res.status(refusal.status).json({ error: refusal.error });
  }

  // Each line comes from the database, and together they add up to the payment summary's total
  const productLines = await Promise.all(cartItems.map(async ({ productId, quantity, deliveryOptionId }) => {
    const product = await Product.findByPk(productId, { paranoid: false });
    return lineItem(product.name, product.priceCents, quantity, { productId, deliveryOptionId });
  }));
  const { shippingCostCents, taxCents } = await calculatePaymentSummary(cartItems);
  const extraLines = [
    ['Shipping & handling', shippingCostCents],
    ['Estimated tax (10%)', taxCents]
  ].filter(([, amountCents]) => amountCents > 0).map(([name, amountCents]) => lineItem(name, amountCents));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [...productLines, ...extraLines],
    metadata: { app: APP_TAG, visitorId: req.visitorId },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`
  });

  res.status(201).json({ url: session.url });
}));

// The success page asks for the order, so it appears even without the webhook, as locally
router.get('/checkout-sessions/:sessionId/order', requireVisitor, asyncHandler(async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId).catch((error) => {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  });
  if (session?.metadata?.app !== APP_TAG || session.metadata.visitorId !== req.visitorId) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  if (session.payment_status !== 'paid') {
    return res.status(409).json({ error: "The payment hasn't gone through." });
  }

  res.json(await fulfillCheckout(session));
}));

// Needs the raw body to check Stripe's signature, so server.js mounts it before the JSON parser
export const handleWebhook = [requireStripe, asyncHandler(async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.get('Stripe-Signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const session = event.data.object;
  if (event.type === 'checkout.session.completed' && session.metadata?.app === APP_TAG
    && session.payment_status === 'paid') {
    await fulfillCheckout(session);
  }
  res.json({ received: true });
})];

export default router;
