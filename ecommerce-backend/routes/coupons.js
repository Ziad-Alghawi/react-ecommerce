import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { findValidCoupon } from '../middleware/coupon.js';

const router = express.Router();

// Lets checkout say whether a code works before using it. Only says what a valid code gives
router.get('/:code', asyncHandler(async (req, res) => {
  const { coupon, error } = await findValidCoupon(req.params.code);
  if (error) {
    return res.status(404).json({ error });
  }
  res.json({ code: coupon.code, percentOff: coupon.percentOff });
}));

export default router;
