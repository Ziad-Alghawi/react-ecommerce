import { CartItem } from '../models/CartItem.js';
import { Order } from '../models/Order.js';

// The format crypto.randomUUID() makes in the browser (any UUID version 1-8)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// The SQLite database lives in memory, so only the most recent visitors keep
// their cart and orders. MAX_VISITORS can lower it, for example in tests
const MAX_VISITORS = Number(process.env.MAX_VISITORS) || 500;

// Visitor IDs from least to most recently active. A Set keeps insertion order,
// so moving a visitor to the end on each request leaves the oldest one first
const visitors = new Set();

function markActive(visitorId) {
  visitors.delete(visitorId);
  visitors.add(visitorId);
}

async function dropOldestVisitors() {
  while (visitors.size > MAX_VISITORS) {
    const oldest = visitors.values().next().value;
    visitors.delete(oldest);
    await CartItem.destroy({ where: { visitorId: oldest } });
    await Order.destroy({ where: { visitorId: oldest } });
  }
}

// After a restart, pick up the visitors that are already in the database
export async function loadVisitors() {
  const attributes = ['visitorId', 'updatedAt'];
  const rows = [
    ...await CartItem.unscoped().findAll({ attributes }),
    ...await Order.unscoped().findAll({ attributes })
  ];

  rows.sort((a, b) => a.updatedAt - b.updatedAt);
  rows.forEach((row) => markActive(row.visitorId));
  await dropOldestVisitors();
}

// Cart and order routes need to know whose cart and orders to use
export async function requireVisitor(req, res, next) {
  const visitorId = req.get('X-Visitor-Id');
  if (!visitorId || !UUID_PATTERN.test(visitorId)) {
    return res.status(400).json({ error: 'Missing or invalid X-Visitor-Id header' });
  }

  // The same ID in another case is the same visitor
  req.visitorId = visitorId.toLowerCase();

  try {
    markActive(req.visitorId);
    await dropOldestVisitors();
  } catch (error) {
    return next(error);
  }
  next();
}
