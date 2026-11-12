import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { Product } from '../models/Product.js';
import { rejectInvalidId } from '../utils/isUuid.js';

const router = express.Router();

router.param('productId', rejectInvalidId('Product not found'));

router.get('/', asyncHandler(async (req, res) => {
  const search = req.query.search;
  let products = await Product.findAll();

  if (search) {
    const lowerCaseSearch = search.toLowerCase();

    products = products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(lowerCaseSearch);
      const keywordsMatch = product.keywords.some((keyword) => keyword.toLowerCase().includes(lowerCaseSearch));
      return nameMatch || keywordsMatch;
    });
  }

  res.json(products);
}));

// Deleted products too, so links from old orders still open, with deletedAt set
router.get('/:productId', asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.productId, { paranoid: false });
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
}));

export default router;
