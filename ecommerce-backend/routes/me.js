import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getUserId } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

// Only tells the frontend what to show. Admin routes still check the token themselves
router.get('/', asyncHandler(async (req, res) => {
  const userId = await getUserId(req);
  res.json({ userId, isAdmin: isAdmin(userId) });
}));

export default router;
