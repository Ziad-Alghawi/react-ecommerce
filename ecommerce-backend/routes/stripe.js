import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireVisitor } from '../middleware/visitor.js';
import { CartItem } from '../models/CartItem.js';
import { Product } from '../models/Product.js';
import { calculatePaymentSummary } from './paymentSummary.js';
import { getOrderRefusal } from './orders.js';
import { corsOrigins } from '../utils/corsOrigins.js';
import { stripe } from '../utils/stripe.js';

const router = express.Router();

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
    payment_method_types: ['card'],
    line_items: [...productLines, ...extraLines],
    metadata: { visitorId: req.visitorId },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`
  });

  res.status(201).json({ url: session.url });
}));

export default router;
