const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Room = require('./Room');
const User = require('./User');

const MeterReading = sequelize.define('MeterReading', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Room,
      key: 'id'
    }
  },
  reading_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  period_month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  period_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  water_previous: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  water_current: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  water_units: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  elec_previous: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  elec_current: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  elec_units: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  water_image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  elec_image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'meter_readings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['room_id', 'period_month', 'period_year']
    }
  ]
});

Room.hasMany(MeterReading, { foreignKey: 'room_id' });
MeterReading.belongsTo(Room, { foreignKey: 'room_id' });

User.hasMany(MeterReading, { foreignKey: 'recorded_by' });
MeterReading.belongsTo(User, { foreignKey: 'recorded_by' });

module.exports = MeterReading;
