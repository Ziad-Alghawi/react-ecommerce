import { Op } from 'sequelize';
import { DemoRestock } from '../models/DemoRestock.js';
import { Product } from '../models/Product.js';
import { defaultProducts } from '../defaultData/defaultProducts.js';

// The store is a public demo, so visitors would otherwise sell it out for good. DEMO_RESTOCK=false turns it off
const isOn = !['false', '0', 'off'].includes(process.env.DEMO_RESTOCK?.trim().toLowerCase());
// Below this, a demo product goes back to the stock it started with
const LOW_STOCK = 5;
// DEMO_RESTOCK_INTERVAL_MS can shorten the day, for example in tests
const INTERVAL_MS = Number(process.env.DEMO_RESTOCK_INTERVAL_MS) || 24 * 60 * 60 * 1000;

// Only the demo products, as the products an admin added are theirs to manage. Products that
// start below LOW_STOCK, such as one sold out on purpose, only go back to where they started
async function restockDemoProducts() {
  const lowProducts = await Product.findAll({ where: { stock: { [Op.lt]: LOW_STOCK } }, attributes: ['id'] });
  for (const { id } of lowProducts) {
    const demoStock = defaultProducts.find((product) => product.id === id)?.stock;
    if (demoStock !== undefined) {
      await Product.update({ stock: demoStock }, { where: { id, stock: { [Op.lt]: Math.min(LOW_STOCK, demoStock) } } });
    }
  }
}

// Kept in memory, so most requests skip the database
let nextRunAtMs = 0;
let running = null;

async function restockIfDayHasPassed() {
  // Not findOrCreate, which needs a transaction the local SQLite file can't hold open
  const state = await DemoRestock.findByPk(1) ?? DemoRestock.build({ id: 1, lastRunAt: new Date(0) });
  if (Date.now() - state.lastRunAt.getTime() >= INTERVAL_MS) {
    await restockDemoProducts();
    await state.update({ lastRunAt: new Date() });
    console.log('Restocked the demo products.');
  }
  nextRunAtMs = state.lastRunAt.getTime() + INTERVAL_MS;
}

// Runs on startup and with product requests. Requests that arrive together wait for the same run
export function restockIfDue() {
  if (!isOn || Date.now() < nextRunAtMs) {
    return Promise.resolve();
  }
  running ??= restockIfDayHasPassed().finally(() => {
    running = null;
  });
  return running;
}
