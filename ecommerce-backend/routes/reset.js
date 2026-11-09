import express from 'express';
import { sequelize } from '../models/index.js';
import { addDefaultData } from '../defaultData/addDefaultData.js';

const router = express.Router();

router.post('/', async (req, res) => {
  // Wiping the database must never be open to the public
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Reset is disabled in production' });
    return;
  }

  await sequelize.sync({ force: true });
  // Carts and orders belong to visitors, so they start empty
  await addDefaultData();

  res.status(204).send();
});

export default router;
