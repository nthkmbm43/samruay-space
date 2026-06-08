const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');
const Room = require('./Room');
const Tenant = require('./Tenant');

const MoveOutRequest = sequelize.define('MoveOutRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  property_id: {
    type: DataTypes.INTEGER,
    references: { model: Property, key: 'id' },
    allowNull: false
  },
  room_id: {
    type: DataTypes.INTEGER,
    references: { model: Room, key: 'id' },
    allowNull: false
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    references: { model: Tenant, key: 'id' },
    allowNull: false
  },
  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending' // pending, approved, inspected, rejected
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'move_out_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Property.hasMany(MoveOutRequest, { foreignKey: 'property_id', as: 'moveOutRequests' });
MoveOutRequest.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

Room.hasMany(MoveOutRequest, { foreignKey: 'room_id', as: 'moveOutRequests' });
MoveOutRequest.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

Tenant.hasMany(MoveOutRequest, { foreignKey: 'tenant_id', as: 'moveOutRequests' });
MoveOutRequest.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

module.exports = MoveOutRequest;
