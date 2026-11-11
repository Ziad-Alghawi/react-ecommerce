import { CartItem } from '../models/CartItem.js';
import { Order } from '../models/Order.js';
import { isUuid } from '../utils/isUuid.js';
import { getUserId } from './auth.js';

// The database is shared and small, so only the most recent visitors keep
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

// A guest's cart and orders go to their account when they log in, and items already
// in the account's cart add up. The local SQLite file can't hold a transaction open,
// so the guest's item is removed first: a failure part way can't count it twice
async function moveToAccount(guestId, userId) {
  const userItems = await CartItem.findAll({ where: { visitorId: userId } });
  const guestItems = await CartItem.findAll({ where: { visitorId: guestId } });

  for (const guestItem of guestItems) {
    const userItem = userItems.find((item) => item.productId === guestItem.productId);
    if (userItem) {
      await guestItem.destroy();
      userItem.quantity += guestItem.quantity;
      await userItem.save();
    } else {
      guestItem.visitorId = userId;
      await guestItem.save();
    }
  }

  await Order.update({ visitorId: userId }, { where: { visitorId: guestId } });
  visitors.delete(guestId);
}

// Moves still running, so parallel requests right after logging in don't move the same cart twice
const moves = new Map();

function moveGuestOnce(guestId, userId) {
  if (!moves.has(guestId)) {
    moves.set(guestId, moveToAccount(guestId, userId).finally(() => moves.delete(guestId)));
  }
  return moves.get(guestId);
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

// Cart and order routes need to know whose cart and orders to use: the signed-in
// user's, or else the guest's. Both are kept under visitorId and count toward the limits
export async function requireVisitor(req, res, next) {
  try {
    const userId = await getUserId(req);
    const guestId = req.get('X-Visitor-Id');
    if (!userId && !isUuid(guestId)) {
      return res.status(400).json({ error: 'Missing or invalid X-Visitor-Id header' });
    }

    // The same ID in another case is the same visitor
    req.visitorId = userId ?? guestId.toLowerCase();

    // Only guests in the list can have a cart or orders, so most requests skip this
    const loggedInGuestId = userId && isUuid(guestId) && guestId.toLowerCase();
    if (loggedInGuestId !== userId && visitors.has(loggedInGuestId)) {
      await moveGuestOnce(loggedInGuestId, userId);
    }
    markActive(req.visitorId);
    await dropOldestVisitors();
  } catch (error) {
    return next(error);
  }
  next();
}
