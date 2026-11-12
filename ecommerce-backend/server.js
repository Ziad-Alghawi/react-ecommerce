// Must come first: the modules below read their settings as soon as they load
import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './models/index.js';
import productRoutes from './routes/products.js';
import reviewRoutes from './routes/reviews.js';
import deliveryOptionRoutes from './routes/deliveryOptions.js';
import cartItemRoutes from './routes/cartItems.js';
import orderRoutes from './routes/orders.js';
import resetRoutes from './routes/reset.js';
import paymentSummaryRoutes from './routes/paymentSummary.js';
import adminRoutes from './routes/admin.js';
import meRoutes from './routes/me.js';
import { loadVisitors, requireVisitor } from './middleware/visitor.js';
import { requireAdmin } from './middleware/admin.js';
import { CartItem } from './models/CartItem.js';
import { Order } from './models/Order.js';
import { Product } from './models/Product.js';
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

app.use(compression());
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/products/:productId/reviews', reviewRoutes);
app.use('/api/delivery-options', deliveryOptionRoutes);
// Each visitor has their own cart and orders. Products are shared
app.use('/api/cart-items', requireVisitor, cartItemRoutes);
app.use('/api/orders', requireVisitor, orderRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/payment-summary', requireVisitor, paymentSummaryRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', requireAdmin, adminRoutes);

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

// Express only treats a handler with four arguments as an error handler, so next has to stay
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Errors like a malformed JSON body come with their own 4xx status and a message safe to show
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err.stack);
    return res.status(status).json({ error: 'Something went wrong!' });
  }
  res.status(status).json({ error: err.message });
});

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

// sync() doesn't change existing tables, so add the columns that came later
const productColumns = await sequelize.getQueryInterface().describeTable(Product.getTableName());
for (const [column, type] of [['deletedAt', DataTypes.DATE(3)], ['demoRating', DataTypes.JSON]]) {
  if (!productColumns[column]) {
    await sequelize.getQueryInterface().addColumn(Product.getTableName(), column, { type });
    console.log(`Added ${column} to the products table.`);
  }
}

await addDefaultData();
await loadVisitors();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
