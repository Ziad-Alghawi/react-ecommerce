import { Coupon } from '../models/Coupon.js';
import { asyncHandler } from './asyncHandler.js';

export function normalizeCouponCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

export function isExpired(coupon) {
  return coupon.expiresAt !== null && coupon.expiresAt <= new Date();
}

// The coupon a customer can use now, or why they can't
export async function findValidCoupon(code) {
  const normalizedCode = normalizeCouponCode(code);
  const coupon = normalizedCode && await Coupon.findOne({ where: { code: normalizedCode } });
  if (!coupon || !coupon.active) {
    return { error: `${normalizedCode || 'This'} isn't a valid coupon code.` };
  }
  if (isExpired(coupon)) {
    return { error: `The coupon ${normalizedCode} has expired.` };
  }
  return { coupon };
}

// The coupon the customer typed, from the query of a GET or the body of a POST. It's checked
// on every request, so one that expires or is turned off between checkout and paying no longer counts
export const readCoupon = asyncHandler(async (req, res, next) => {
  const code = req.method === 'GET' ? req.query.couponCode : req.body?.couponCode;
  if (!normalizeCouponCode(code)) {
    req.coupon = null;
    return next();
  }

  const { coupon, error } = await findValidCoupon(code);
  if (error) {
    return res.status(400).json({ error });
  }
  req.coupon = coupon;
  next();
});
