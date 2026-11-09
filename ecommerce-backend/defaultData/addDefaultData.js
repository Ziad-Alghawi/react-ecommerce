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

export async function addDefaultData() {
  const timestamp = Date.now();
  await Product.bulkCreate(withTimestamps(defaultProducts, timestamp));
  await DeliveryOption.bulkCreate(withTimestamps(defaultDeliveryOptions, timestamp));
}
