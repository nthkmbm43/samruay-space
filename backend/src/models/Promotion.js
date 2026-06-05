const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');
const User = require('./User');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  property_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Property,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  applies_to: {
    type: DataTypes.STRING(30),
    defaultValue: 'room_price'
  },
  target_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'all'
  },
  target_ids: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  min_months: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  max_uses: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'promotions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Property.hasMany(Promotion, { foreignKey: 'property_id' });
Promotion.belongsTo(Property, { foreignKey: 'property_id' });

User.hasMany(Promotion, { foreignKey: 'created_by' });
Promotion.belongsTo(User, { foreignKey: 'created_by' });

module.exports = Promotion;
