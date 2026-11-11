import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

// Users who have logged in. Their carts and orders share the visitorId column with
// guests', so this is how a restarted server tells them apart
export const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  createdAt: {
    type: DataTypes.DATE(3)
  },
  updatedAt: {
    type: DataTypes.DATE(3)
  },
});
