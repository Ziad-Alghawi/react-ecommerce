import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getUserId, requireUser } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { MAX_REVIEW_TEXT_LENGTH, Review } from '../models/Review.js';
import { isUuid } from '../utils/isUuid.js';

// Mounted under /api/products/:productId, so it needs the parent's productId
const router = express.Router({ mergeParams: true });

// Deleted products keep their reviews, like they stay in old orders
router.use(asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  req.product = isUuid(productId) && await Product.findByPk(productId, { paranoid: false });
  if (!req.product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  next();
}));

router.param('reviewId', asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;
  req.review = isUuid(reviewId) && await Review.findOne({ where: { id: reviewId, productId: req.product.id } });
  if (!req.review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  next();
}));

// Never includes the author's user ID, only whether it's the user asking
function toResponse(review, userId) {
  const { userId: authorId, ...fields } = review.toJSON();
  return { ...fields, isMine: authorId === userId };
}

// "jane.doe@example.com" is shown as "jane.doe"
function getAuthorName(email) {
  return email?.split('@')[0] || 'Customer';
}

// Logged in users keep their orders, so this is every order the user has placed
async function hasOrdered(userId, productId) {
  const orders = await Order.unscoped().findAll({ where: { visitorId: userId }, attributes: ['products'] });
  return orders.some((order) => order.products.some((orderProduct) => orderProduct.productId === productId));
}

// The fields a user can set, or the reason they're refused
function readReviewFields({ stars, text = null }) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: 'Stars must be a whole number from 1 to 5' };
  }

  if (text !== null && (typeof text !== 'string' || text.trim().length > MAX_REVIEW_TEXT_LENGTH)) {
    return { error: `The review text can be up to ${MAX_REVIEW_TEXT_LENGTH} characters` };
  }

  return { fields: { stars, text: text?.trim() || null } };
}

router.get('/', asyncHandler(async (req, res) => {
  const userId = await getUserId(req);
  const reviews = await Review.findAll({ where: { productId: req.product.id } });

  res.json({
    reviews: reviews.map((review) => toResponse(review, userId)),
    canReview: Boolean(userId) && await hasOrdered(userId, req.product.id)
  });
}));

router.post('/', requireUser, asyncHandler(async (req, res) => {
  const { user, product } = req;

  if (!await hasOrdered(user.id, product.id)) {
    return res.status(403).json({ error: 'Only customers who ordered this product can review it.' });
  }

  if (await Review.findOne({ where: { productId: product.id, userId: user.id } })) {
    return res.status(409).json({ error: "You've already reviewed this product. Edit your review instead." });
  }

  const { error, fields } = readReviewFields(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const review = await Review.create({
    ...fields,
    productId: product.id,
    userId: user.id,
    authorName: getAuthorName(user.email)
  });
  res.status(201).json(toResponse(review, user.id));
}));

router.put('/:reviewId', requireUser, asyncHandler(async (req, res) => {
  const { review, user } = req;
  if (review.userId !== user.id) {
    return res.status(403).json({ error: 'You can only edit your own review.' });
  }

  const { error, fields } = readReviewFields(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  await review.update(fields);
  res.json(toResponse(review, user.id));
}));

router.delete('/:reviewId', requireUser, asyncHandler(async (req, res) => {
  const { review, user } = req;
  if (review.userId !== user.id && !isAdmin(user.id)) {
    return res.status(403).json({ error: 'You can only delete your own review.' });
  }

  await review.destroy();
  res.status(204).send();
}));

export default router;
