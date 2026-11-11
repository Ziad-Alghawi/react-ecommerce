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

// Only fills empty tables, so a persistent database keeps its rows across restarts and deploys
export async function addDefaultData() {
  const timestamp = Date.now();
  const defaults = [[Product, defaultProducts], [DeliveryOption, defaultDeliveryOptions]];

  for (const [model, rows] of defaults) {
    if (await model.count() === 0) {
      await model.bulkCreate(withTimestamps(rows, timestamp));
      console.log(`Added the default ${model.getTableName()}.`);
    }
  }
}
