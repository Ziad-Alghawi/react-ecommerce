import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { CartItem } from '../models/CartItem.js';
import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { isUuid } from '../utils/isUuid.js';

const router = express.Router();

router.param('productId', (req, res, next, productId) => {
  if (!isUuid(productId)) {
    return res.status(404).json({ error: 'Cart item not found' });
  }
  next();
});

router.get('/', asyncHandler(async (req, res) => {
  const expand = req.query.expand;
  let cartItems = await CartItem.findAll({ where: { visitorId: req.visitorId } });

  if (expand === 'product') {
    cartItems = await Promise.all(cartItems.map(async (item) => {
      const product = await Product.findByPk(item.productId);
      return {
        ...item.toJSON(),
        product
      };
    }));
  }

  res.json(cartItems);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const product = isUuid(productId) && await Product.findByPk(productId);
  if (!product) {
    return res.status(400).json({ error: 'Product not found' });
  }

  if (typeof quantity !== 'number' || quantity < 1 || quantity > 10) {
    return res.status(400).json({ error: 'Quantity must be a number between 1 and 10' });
  }

  let cartItem = await CartItem.findOne({ where: { productId, visitorId: req.visitorId } });
  if (cartItem) {
    cartItem.quantity += quantity;
    await cartItem.save();
  } else {
    cartItem = await CartItem.create({ productId, quantity, deliveryOptionId: "1", visitorId: req.visitorId });
  }

  res.status(201).json(cartItem);
}));

router.put('/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity, deliveryOptionId } = req.body;

  const cartItem = await CartItem.findOne({ where: { productId, visitorId: req.visitorId } });
  if (!cartItem) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  if (quantity !== undefined) {
    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be a number greater than 0' });
    }
    cartItem.quantity = quantity;
  }

  if (deliveryOptionId !== undefined) {
    const deliveryOption = await DeliveryOption.findByPk(deliveryOptionId);
    if (!deliveryOption) {
      return res.status(400).json({ error: 'Invalid delivery option' });
    }
    cartItem.deliveryOptionId = deliveryOptionId;
  }

  await cartItem.save();
  res.json(cartItem);
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cartItem = await CartItem.findOne({ where: { productId, visitorId: req.visitorId } });
  if (!cartItem) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  await cartItem.destroy();
  res.status(204).send();
}));

export default router;
