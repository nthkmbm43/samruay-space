const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');
const Floor = require('./Floor');
const RoomType = require('./RoomType');

const Room = sequelize.define('Room', {
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
  floor_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Floor,
      key: 'id'
    }
  },
  room_type_id: {
    type: DataTypes.INTEGER,
    references: {
      model: RoomType,
      key: 'id'
    }
  },
  room_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  price_override: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  rental_type: {
    type: DataTypes.ENUM('monthly', 'daily', 'both'),
    defaultValue: 'both'
  },
  price_per_day: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'available'
  },
  water_meter_start: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  elec_meter_start: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['property_id', 'room_number']
    }
  ]
});

Property.hasMany(Room, { foreignKey: 'property_id' });
Room.belongsTo(Property, { foreignKey: 'property_id' });

Floor.hasMany(Room, { foreignKey: 'floor_id' });
Room.belongsTo(Floor, { foreignKey: 'floor_id' });

RoomType.hasMany(Room, { foreignKey: 'room_type_id' });
Room.belongsTo(RoomType, { foreignKey: 'room_type_id' });

module.exports = Room;
