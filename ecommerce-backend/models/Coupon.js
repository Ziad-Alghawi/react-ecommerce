import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Saved in capitals, so customers can type it in any case
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // Taken off the items, before shipping and tax
  percentOff: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Null for a coupon that never expires
  expiresAt: {
    type: DataTypes.DATE(3)
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  // Checkout suggests the newest featured coupon that can be used
  featured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  }
});
