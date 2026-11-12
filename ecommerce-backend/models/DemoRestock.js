import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

// A single row with when the demo products were last restocked. It's in the database, so a
// server that sleeps and restarts often still restocks only once a day
export const DemoRestock = sequelize.define('DemoRestock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  lastRunAt: {
    type: DataTypes.DATE(3),
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE(3)
  },
  updatedAt: {
    type: DataTypes.DATE(3)
  },
});
