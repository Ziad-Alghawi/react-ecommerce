import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { CartItem } from '../models/CartItem.js';
import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { readCoupon } from '../middleware/coupon.js';

const router = express.Router();

// Placing an order uses this too, so the order total always matches what checkout showed.
// A coupon takes its percentage off the items, and tax is worked out after it
export async function calculatePaymentSummary(cartItems, coupon = null) {
  let totalItems = 0;
  let productCostCents = 0;
  let shippingCostCents = 0;

  for (const item of cartItems) {
    const product = await Product.findByPk(item.productId, { paranoid: false });
    const deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);
    totalItems += item.quantity;
    productCostCents += product.priceCents * item.quantity;
    shippingCostCents += deliveryOption.priceCents;
  }

  const discountCents = coupon ? Math.round(productCostCents * coupon.percentOff / 100) : 0;
  const totalCostBeforeTaxCents = productCostCents - discountCents + shippingCostCents;
  const taxCents = Math.round(totalCostBeforeTaxCents * 0.1);
  const totalCostCents = totalCostBeforeTaxCents + taxCents;

  return {
    totalItems,
    productCostCents,
    coupon: coupon && { code: coupon.code, percentOff: coupon.percentOff },
    discountCents,
    shippingCostCents,
    totalCostBeforeTaxCents,
    taxCents,
    totalCostCents
  };
}

router.get('/', readCoupon, asyncHandler(async (req, res) => {
  const cartItems = await CartItem.findAll({ where: { visitorId: req.visitorId } });
  res.json(await calculatePaymentSummary(cartItems, req.coupon));
}));

export default router;
