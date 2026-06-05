const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');

const RoomType = sequelize.define('RoomType', {
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
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  base_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1500
  },
  area_sqm: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  amenities: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'room_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

Property.hasMany(RoomType, { foreignKey: 'property_id' });
RoomType.belongsTo(Property, { foreignKey: 'property_id' });

module.exports = RoomType;
