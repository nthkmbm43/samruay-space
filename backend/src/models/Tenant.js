const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Room = require('./Room');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  room_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Room,
      key: 'id'
    }
  },
  id_card_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  id_card_image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  emergency_contact_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  vehicle_info: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

User.hasOne(Tenant, { foreignKey: 'user_id', as: 'tenant' });
Tenant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Room.hasMany(Tenant, { foreignKey: 'room_id', as: 'tenants' });
Tenant.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

module.exports = Tenant;
