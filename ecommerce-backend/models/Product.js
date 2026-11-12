import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const PRODUCT_CATEGORIES = ['Home & Kitchen', 'Clothing', 'Shoes', 'Accessories', 'Sports'];

export const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rating: {
    type: DataTypes.JSON,
    allowNull: false
  },
  // The rating from the demo data, which reviews are added to. Saved when the first review changes the rating
  demoRating: {
    type: DataTypes.JSON
  },
  priceCents: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  keywords: {
    type: DataTypes.STRING,
    allowNull: false,
    get() {
      const keywords = this.getDataValue('keywords');
      return keywords ? keywords.split(',') : [];
    },
    set(val) {
      this.setDataValue('keywords', val.join(','));
    }
  },
  // One of PRODUCT_CATEGORIES. Empty only in a database from before categories, until addDefaultData fills it
  category: {
    type: DataTypes.STRING
  },
  // How many can still be ordered. Empty only in a database from before stock, until addDefaultData fills it
  stock: {
    type: DataTypes.INTEGER
  },
  createdAt: {
    type: DataTypes.DATE(3)
  },
  updatedAt: {
    type: DataTypes.DATE(3)
  },
  deletedAt: {
    type: DataTypes.DATE(3)
  },
}, {
  // Deleting only hides a product, so the carts and orders that have it keep working.
  // Queries skip hidden products unless they pass paranoid: false
  paranoid: true,
  defaultScope: {
    order: [['createdAt', 'ASC']]
  }
});

// The demo rating is only for working out the rating, so responses leave it out
Product.prototype.toJSON = function () {
  const product = this.get({ plain: true });
  delete product.demoRating;
  return product;
};
