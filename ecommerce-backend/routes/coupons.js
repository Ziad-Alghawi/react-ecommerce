import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { findValidCoupon, isExpired } from '../middleware/coupon.js';
import { Coupon } from '../models/Coupon.js';

const router = express.Router();

// Lets checkout say whether a code works before using it. Only says what a valid code gives
router.get('/:code', asyncHandler(async (req, res) => {
  const { coupon, error } = await findValidCoupon(req.params.code);
  if (error) {
    return res.status(404).json({ error });
  }
  res.json({ code: coupon.code, percentOff: coupon.percentOff });
}));

// Its own path, as /api/coupons/featured would hide a coupon with the code FEATURED
export const getFeaturedCoupon = asyncHandler(async (req, res) => {
  const coupons = await Coupon.unscoped().findAll({
    where: { active: true, featured: true },
    order: [['createdAt', 'DESC']]
  });
  const coupon = coupons.find((featured) => !isExpired(featured));
  res.json(coupon ? { code: coupon.code, percentOff: coupon.percentOff } : null);
});

export default router;
