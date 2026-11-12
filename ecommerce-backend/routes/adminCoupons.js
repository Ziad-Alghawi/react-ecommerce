import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { normalizeCouponCode } from '../middleware/coupon.js';
import { Coupon } from '../models/Coupon.js';
import { rejectInvalidId } from '../utils/isUuid.js';

const router = express.Router();

// Over 90% off, a payment could come to less than Stripe's minimum charge
const MAX_PERCENT_OFF = 90;
const CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

router.param('couponId', rejectInvalidId('Coupon not found'));

// The fields an admin can set, or the reason they're refused
function readCouponFields({ code, percentOff, expiresAt = null, active, featured }) {
  const normalizedCode = normalizeCouponCode(code);
  if (!CODE_PATTERN.test(normalizedCode)) {
    return { error: 'Code must be 3 to 20 letters or digits' };
  }

  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > MAX_PERCENT_OFF) {
    return { error: `Percent off must be a whole number from 1 to ${MAX_PERCENT_OFF}` };
  }

  const expiryDate = expiresAt === null ? null : new Date(expiresAt);
  if (expiryDate && (typeof expiresAt !== 'string' || Number.isNaN(expiryDate.getTime()))) {
    return { error: 'Expiry must be a date, or null for a coupon that never expires' };
  }

  if (typeof active !== 'boolean' || typeof featured !== 'boolean') {
    return { error: 'Active and featured must be true or false' };
  }

  return { fields: { code: normalizedCode, percentOff, expiresAt: expiryDate, active, featured } };
}

async function isCodeTaken(code, exceptId = null) {
  const coupon = await Coupon.findOne({ where: { code } });
  return Boolean(coupon) && coupon.id !== exceptId;
}

router.get('/', asyncHandler(async (req, res) => {
  res.json(await Coupon.findAll());
}));

router.post('/', asyncHandler(async (req, res) => {
  const { error, fields } = readCouponFields(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  if (await isCodeTaken(fields.code)) {
    return res.status(409).json({ error: `There's already a coupon with the code ${fields.code}` });
  }

  res.status(201).json(await Coupon.create(fields));
}));

router.put('/:couponId', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.couponId);
  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  const { error, fields } = readCouponFields(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  if (await isCodeTaken(fields.code, coupon.id)) {
    return res.status(409).json({ error: `There's already a coupon with the code ${fields.code}` });
  }

  res.json(await coupon.update(fields));
}));

export default router;
