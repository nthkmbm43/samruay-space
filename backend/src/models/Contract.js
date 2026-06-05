const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Room = require('./Room');
const Tenant = require('./Tenant');
const User = require('./User');

const Contract = sequelize.define('Contract', {
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
  tenant_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Tenant,
      key: 'id'
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  monthly_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  deposit_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  deposit_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  move_in_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  move_out_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  move_out_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  initial_water_meter: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  initial_elec_meter: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  contract_file: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'contracts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Room.hasMany(Contract, { foreignKey: 'room_id' });
Contract.belongsTo(Room, { foreignKey: 'room_id' });

Tenant.hasMany(Contract, { foreignKey: 'tenant_id' });
Contract.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.hasMany(Contract, { foreignKey: 'created_by', as: 'CreatedContracts' });
Contract.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });

module.exports = Contract;
