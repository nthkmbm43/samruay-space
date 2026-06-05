const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Property = require('./Property');
const Room = require('./Room');
const Tenant = require('./Tenant');
const Contract = require('./Contract');
const Promotion = require('./Promotion');
const User = require('./User');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING(30),
    unique: true,
    allowNull: false
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
  contract_id: {
    type: DataTypes.INTEGER,
    references: { model: Contract, key: 'id' }
  },
  period_month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  period_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  room_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  water_previous: { type: DataTypes.DECIMAL(10, 2) },
  water_current: { type: DataTypes.DECIMAL(10, 2) },
  water_units: { type: DataTypes.DECIMAL(10, 2) },
  water_rate: { type: DataTypes.DECIMAL(10, 2) },
  water_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  elec_previous: { type: DataTypes.DECIMAL(10, 2) },
  elec_current: { type: DataTypes.DECIMAL(10, 2) },
  elec_units: { type: DataTypes.DECIMAL(10, 2) },
  elec_rate: { type: DataTypes.DECIMAL(10, 2) },
  elec_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  other_charges: { type: DataTypes.JSONB, defaultValue: [] },
  promotion_id: {
    type: DataTypes.INTEGER,
    references: { model: Promotion, key: 'id' }
  },
  discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discount_note: { type: DataTypes.TEXT },
  subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  vat_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  vat_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  late_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  payment_method: { type: DataTypes.STRING(20) },
  paid_at: { type: DataTypes.DATE },
  paid_amount: { type: DataTypes.DECIMAL(10, 2) },
  notes: { type: DataTypes.TEXT },
  generated_by: { type: DataTypes.STRING(10), defaultValue: 'auto' },
  created_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' }
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['room_id'] },
    { fields: ['tenant_id'] },
    { fields: ['status'] },
    { fields: ['due_date'] }
  ]
});

Property.hasMany(Invoice, { foreignKey: 'property_id' });
Invoice.belongsTo(Property, { foreignKey: 'property_id' });

Room.hasMany(Invoice, { foreignKey: 'room_id' });
Invoice.belongsTo(Room, { foreignKey: 'room_id' });

Tenant.hasMany(Invoice, { foreignKey: 'tenant_id' });
Invoice.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Contract.hasMany(Invoice, { foreignKey: 'contract_id' });
Invoice.belongsTo(Contract, { foreignKey: 'contract_id' });

Promotion.hasMany(Invoice, { foreignKey: 'promotion_id' });
Invoice.belongsTo(Promotion, { foreignKey: 'promotion_id' });

User.hasMany(Invoice, { foreignKey: 'created_by' });
Invoice.belongsTo(User, { foreignKey: 'created_by' });

module.exports = Invoice;
