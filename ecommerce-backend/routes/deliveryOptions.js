import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { DeliveryOption, estimateDeliveryTimeMs } from '../models/DeliveryOption.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const expand = req.query.expand;
  let deliveryOptions = await DeliveryOption.findAll();

  if (expand === 'estimatedDeliveryTime') {
    deliveryOptions = deliveryOptions.map((option) => ({
      ...option.toJSON(),
      estimatedDeliveryTimeMs: estimateDeliveryTimeMs(option)
    }));
  }

  res.json(deliveryOptions);
}));

export default router;
