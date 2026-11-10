import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { DeliveryOption, estimateDeliveryTimeMs } from '../models/DeliveryOption.js';
import { CartItem } from '../models/CartItem.js';
import { calculatePaymentSummary } from './paymentSummary.js';

const router = express.Router();

// Keeps one visitor from filling the shared database. MAX_ORDERS can lower it, for example in tests
const MAX_ORDERS = Number(process.env.MAX_ORDERS) || 50;

async function withProductDetails(order) {
  const products = await Promise.all(order.products.map(async (orderProduct) => ({
    ...orderProduct,
    product: await Product.findByPk(orderProduct.productId)
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

router.post('/', asyncHandler(async (req, res) => {
  const cartItems = await CartItem.findAll({ where: { visitorId: req.visitorId } });

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  if (await Order.count({ where: { visitorId: req.visitorId } }) >= MAX_ORDERS) {
    return res.status(409).json({
      error: `This demo store keeps up to ${MAX_ORDERS} orders per visitor, and you've reached the limit.`
    });
  }

  const products = await Promise.all(cartItems.map(async (item) => {
    const deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      estimatedDeliveryTimeMs: estimateDeliveryTimeMs(deliveryOption)
    };
  }));
  const { totalCostCents } = await calculatePaymentSummary(cartItems);

  const order = await Order.create({
    orderTimeMs: Date.now(),
    totalCostCents,
    products,
    visitorId: req.visitorId
  });

  await CartItem.destroy({ where: { visitorId: req.visitorId } });

  res.status(201).json(order);
}));

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
