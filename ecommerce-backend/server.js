import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './models/index.js';
import productRoutes from './routes/products.js';
import deliveryOptionRoutes from './routes/deliveryOptions.js';
import cartItemRoutes from './routes/cartItems.js';
import orderRoutes from './routes/orders.js';
import resetRoutes from './routes/reset.js';
import paymentSummaryRoutes from './routes/paymentSummary.js';
import { loadVisitors, requireVisitor } from './middleware/visitor.js';
import { Product } from './models/Product.js';
import { CartItem } from './models/CartItem.js';
import { Order } from './models/Order.js';
import { addDefaultData } from './defaultData/addDefaultData.js';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comma-separated list of frontend origins allowed to call the API from another domain
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/delivery-options', deliveryOptionRoutes);
// Each visitor has their own cart and orders. Products are shared
app.use('/api/cart-items', requireVisitor, cartItemRoutes);
app.use('/api/orders', requireVisitor, orderRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/payment-summary', requireVisitor, paymentSummaryRoutes);

// The built frontend, including the product images from its public folder
app.use(express.static(path.join(__dirname, 'dist')));

// Let React Router handle every other path
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
/* eslint-enable no-unused-vars */

// Older databases have one cart and order list shared by everyone, which can't
// be split between visitors. Drop those two tables so sync() makes them again
for (const model of [CartItem, Order]) {
  // Fails when the table doesn't exist yet, which is fine
  const columns = await sequelize.getQueryInterface()
    .describeTable(model.getTableName())
    .catch(() => null);
  if (columns && !columns.visitorId) {
    await model.drop();
    console.log(`Dropped the old shared ${model.getTableName()} table.`);
  }
}

await sequelize.sync();

if (await Product.count() === 0) {
  await addDefaultData();
  console.log('Default data added to the database.');
}

await loadVisitors();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
