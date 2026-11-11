import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  visitorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  orderTimeMs: {
    type: DataTypes.BIGINT,
    allowNull: false,
    // Postgres returns BIGINT as a string. Millisecond timestamps fit safely in a JS number
    get() {
      return Number(this.getDataValue('orderTimeMs'));
    }
  },
  totalCostCents: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  products: {
    type: DataTypes.JSON,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE(3)
  },
  updatedAt: {
    type: DataTypes.DATE(3)
  },
}, {
  defaultScope: {
    order: [['createdAt', 'ASC']]
  },
  indexes: [{ fields: ['visitorId'] }]
});
