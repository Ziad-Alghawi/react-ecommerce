import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { defaultProducts } from './defaultProducts.js';
import { defaultDeliveryOptions } from './defaultDeliveryOptions.js';

// The models are sorted by createdAt, so each row gets its own timestamp to keep the list order
function withTimestamps(rows, timestamp) {
  return rows.map((row, index) => ({
    ...row,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index)
  }));
}

// A database from before a product column was added has it empty, so the demo products get
// theirs from the demo data. Products an admin added keep it empty until an admin sets it
async function fillNewProductColumns() {
  const products = await Product.findAll({ where: { category: null }, paranoid: false });
  for (const product of products) {
    const defaults = defaultProducts.find(({ id }) => id === product.id);
    if (defaults) {
      await product.update({ category: defaults.category });
    }
  }
}

// Only fills empty tables, so a persistent database keeps its rows across restarts and deploys
export async function addDefaultData() {
  const timestamp = Date.now();
  const defaults = [[Product, defaultProducts], [DeliveryOption, defaultDeliveryOptions]];

  for (const [model, rows] of defaults) {
    // Hidden products still take up their IDs
    if (await model.count({ paranoid: false }) === 0) {
      await model.bulkCreate(withTimestamps(rows, timestamp));
      console.log(`Added the default ${model.getTableName()}.`);
    }
  }

  await fillNewProductColumns();
}
