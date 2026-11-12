import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';
import { Product } from '../models/Product.js';

const stockColumn = sequelize.getQueryInterface().quoteIdentifier('stock');

// Hidden products too: they stay in carts and can still be ordered
function lowerStock(productId, by, where = {}) {
  return Product.update(
    { stock: sequelize.literal(`${stockColumn} - ${Number(by)}`) },
    { where: { id: productId, ...where }, paranoid: false }
  );
}

// One statement checks and lowers the stock, so two orders at once can't both take the last one
async function takeIfInStock({ productId, quantity }) {
  const [updatedRows] = await lowerStock(productId, quantity, { stock: { [Op.gte]: quantity } });
  return updatedRows === 1;
}

export function giveBackStock(items) {
  return Promise.all(items.map(({ productId, quantity }) => lowerStock(productId, -quantity)));
}

// Takes every item out of stock, or none of them. The local SQLite file can't hold a transaction
// open, so what was taken is given back when an item runs out. Returns whether it worked
export async function takeStock(items) {
  const taken = [];
  for (const item of items) {
    if (!await takeIfInStock(item)) {
      await giveBackStock(taken);
      return false;
    }
    taken.push(item);
  }
  return true;
}

// For an order that's already paid, so it can't be refused: an item that sold out
// meanwhile goes down to 0 rather than below it
export async function takePaidStock(items) {
  for (const item of items) {
    if (!await takeIfInStock(item)) {
      await Product.update({ stock: 0 }, { where: { id: item.productId }, paranoid: false });
    }
  }
}

// Why the items can't be ordered as they are, or null when there's enough of each
export async function getStockShortage(items) {
  for (const { productId, quantity } of items) {
    const product = await Product.findByPk(productId, { paranoid: false });
    if (product.stock < quantity) {
      return product.stock === 0
        ? `${product.name} is out of stock. Remove it from your cart to continue.`
        : `Only ${product.stock} of ${product.name} left in stock. Lower the quantity in your cart to continue.`;
    }
  }
  return null;
}
