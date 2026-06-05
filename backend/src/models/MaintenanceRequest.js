const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');
const Room = require('./Room');
const Tenant = require('./Tenant');
const User = require('./User');

const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  property_id: {
    type: DataTypes.INTEGER,
    references: { model: Property, key: 'id' }
  },
  room_id: {
    type: DataTypes.INTEGER,
    references: { model: Room, key: 'id' }
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    references: { model: Tenant, key: 'id' }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'normal'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending'
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' }
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tenant_rating: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tenant_feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'maintenance_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Property.hasMany(MaintenanceRequest, { foreignKey: 'property_id' });
MaintenanceRequest.belongsTo(Property, { foreignKey: 'property_id' });

Room.hasMany(MaintenanceRequest, { foreignKey: 'room_id' });
MaintenanceRequest.belongsTo(Room, { foreignKey: 'room_id' });

Tenant.hasMany(MaintenanceRequest, { foreignKey: 'tenant_id' });
MaintenanceRequest.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.hasMany(MaintenanceRequest, { foreignKey: 'assigned_to' });
MaintenanceRequest.belongsTo(User, { foreignKey: 'assigned_to' });

module.exports = MaintenanceRequest;
