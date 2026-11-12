import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const MAX_REVIEW_TEXT_LENGTH = 500;

export const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Shown in place of the email, which stays private
  authorName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stars: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  text: {
    type: DataTypes.STRING(MAX_REVIEW_TEXT_LENGTH)
  },
  createdAt: {
    type: DataTypes.DATE(3)
  },
  updatedAt: {
    type: DataTypes.DATE(3)
  },
}, {
  defaultScope: {
    order: [['createdAt', 'DESC']]
  },
  // One review per user per product
  indexes: [{ unique: true, fields: ['productId', 'userId'] }]
});
