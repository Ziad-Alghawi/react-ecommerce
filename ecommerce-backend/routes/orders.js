import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { DeliveryOption, estimateDeliveryTimeMs } from '../models/DeliveryOption.js';
import { CartItem } from '../models/CartItem.js';
import { calculatePaymentSummary } from './paymentSummary.js';
import { readCoupon } from '../middleware/coupon.js';
import { rejectInvalidId } from '../utils/isUuid.js';
import { getStockShortage, giveBackStock, takeStock } from '../utils/stock.js';

const router = express.Router();

router.param('orderId', rejectInvalidId('Order not found'));

// Keeps one visitor from filling the shared database. MAX_ORDERS can lower it, for example in tests
const MAX_ORDERS = Number(process.env.MAX_ORDERS) || 50;

async function withProductDetails(order) {
  const products = await Promise.all(order.products.map(async (orderProduct) => ({
    ...orderProduct,
    product: await Product.findByPk(orderProduct.productId, { paranoid: false })
  })));
  return { ...order.toJSON(), products };
}

router.get('/', asyncHandler(async (req, res) => {
  const expand = req.query.expand;
  let orders = await Order.unscoped().findAll({
    where: { visitorId: req.visitorId },
    order: [['orderTimeMs', 'DESC']]
  });

  if (expand === 'products') {
    orders = await Promise.all(orders.map(withProductDetails));
  }

  res.json(orders);
}));

// Why the visitor can't order their cart, or null when they can
export async function getOrderRefusal(visitorId, cartItems) {
  if (cartItems.length === 0) {
    return { status: 400, error: 'Cart is empty' };
  }
  if (await Order.count({ where: { visitorId } }) >= MAX_ORDERS) {
    return {
      status: 409,
      error: `This demo store keeps up to ${MAX_ORDERS} orders per visitor, and you've reached the limit.`
    };
  }
  const shortage = await getStockShortage(cartItems);
  return shortage && { status: 409, error: shortage };
}

router.post('/', readCoupon, asyncHandler(async (req, res) => {
  const cartItems = await CartItem.findAll({ where: { visitorId: req.visitorId } });

  const refusal = await getOrderRefusal(req.visitorId, cartItems);
  if (refusal) {
    return res.status(refusal.status).json({ error: refusal.error });
  }

  const { totalCostCents } = await calculatePaymentSummary(cartItems, req.coupon);
  // Another order may have taken the last ones since the check above
  if (!await takeStock(cartItems)) {
    return res.status(409).json({ error: await getStockShortage(cartItems) });
  }

  let order;
  try {
    order = await createOrder(req.visitorId, cartItems, { totalCostCents });
  } catch (error) {
    await giveBackStock(cartItems);
    throw error;
  }

  await CartItem.destroy({ where: { visitorId: req.visitorId } });

  res.status(201).json(order);
}));

// Items are { productId, quantity, deliveryOptionId }, from the cart or from a paid Stripe session
export async function createOrder(visitorId, items, { totalCostCents, paymentMethod = 'delivery', stripeSessionId = null }) {
  const products = await Promise.all(items.map(async ({ productId, quantity, deliveryOptionId }) => ({
    productId,
    quantity,
    estimatedDeliveryTimeMs: estimateDeliveryTimeMs(await DeliveryOption.findByPk(deliveryOptionId))
  })));

  return Order.create({
    orderTimeMs: Date.now(),
    totalCostCents,
    products,
    paymentMethod,
    stripeSessionId,
    visitorId
  });
}

router.get('/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const expand = req.query.expand;

  // Another visitor's order is "not found", the same as an order that doesn't exist
  let order = await Order.findOne({ where: { id: orderId, visitorId: req.visitorId } });
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (expand === 'products') {
    order = await withProductDetails(order);
  }

  res.json(order);
}));

export default router;
