const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  owner_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  qr_code_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tax_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bank_account: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  promptpay_id: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  line_channel_access_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  line_channel_secret: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'properties',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Relationships
User.hasMany(Property, { foreignKey: 'owner_id' });
Property.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

module.exports = Property;
