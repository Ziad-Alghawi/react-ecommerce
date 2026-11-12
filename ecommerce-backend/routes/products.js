import express from 'express';
import { Op } from 'sequelize';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { PRODUCT_CATEGORIES, Product } from '../models/Product.js';
import { rejectInvalidId } from '../utils/isUuid.js';
import { restockIfDue } from '../utils/demoRestock.js';

const router = express.Router();

router.param('productId', rejectInvalidId('Product not found'));

router.use(asyncHandler(async (req, res, next) => {
  await restockIfDue();
  next();
}));

// Without a sort, products keep the store's own order. Ties in rating go to the most rated
const SORTS = {
  'price-asc': (a, b) => a.priceCents - b.priceCents,
  'price-desc': (a, b) => b.priceCents - a.priceCents,
  rating: (a, b) => b.rating.stars - a.rating.stars || b.rating.count - a.rating.count,
  newest: (a, b) => b.createdAt - a.createdAt
};

// The filters as a database query, or the reason they're refused
function readFilters({ category = '', sort = '', minPriceCents = '', maxPriceCents = '' }) {
  // A repeated parameter arrives as a list
  if (![category, sort, minPriceCents, maxPriceCents].every((value) => typeof value === 'string')) {
    return { error: 'Each filter can only be given once' };
  }
  if (sort && !Object.hasOwn(SORTS, sort)) {
    return { error: `Sort must be one of: ${Object.keys(SORTS).join(', ')}` };
  }
  if (![minPriceCents, maxPriceCents].every((price) => /^\d*$/.test(price))) {
    return { error: 'Prices must be whole numbers of cents' };
  }

  const where = {};
  if (category) {
    where.category = category;
  }
  if (minPriceCents || maxPriceCents) {
    where.priceCents = {
      ...(minPriceCents && { [Op.gte]: Number(minPriceCents) }),
      ...(maxPriceCents && { [Op.lte]: Number(maxPriceCents) })
    };
  }
  return { where, compare: SORTS[sort] };
}

router.get('/', asyncHandler(async (req, res) => {
  const { error, where, compare } = readFilters(req.query);
  if (error) {
    return res.status(400).json({ error });
  }

  let products = await Product.findAll({ where });

  const search = req.query.search;
  if (typeof search === 'string' && search) {
    const lowerCaseSearch = search.toLowerCase();

    products = products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(lowerCaseSearch);
      const keywordsMatch = product.keywords.some((keyword) => keyword.toLowerCase().includes(lowerCaseSearch));
      return nameMatch || keywordsMatch;
    });
  }

  res.json(compare ? products.sort(compare) : products);
}));

router.get('/categories', (req, res) => {
  res.json(PRODUCT_CATEGORIES);
});

// Deleted products too, so links from old orders still open, with deletedAt set
router.get('/:productId', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.productId, { paranoid: false });
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
}));

export default router;
