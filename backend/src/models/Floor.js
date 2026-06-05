const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');

const Floor = sequelize.define('Floor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  property_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Property,
      key: 'id'
    }
  },
  floor_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'floors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['property_id', 'floor_number']
    }
  ]
});

Property.hasMany(Floor, { foreignKey: 'property_id' });
Floor.belongsTo(Property, { foreignKey: 'property_id' });

module.exports = Floor;
