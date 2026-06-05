const sequelize = require('../config/database');

const User = require('./User');
const Property = require('./Property');
const Floor = require('./Floor');
const RoomType = require('./RoomType');
const Room = require('./Room');
const Tenant = require('./Tenant');
const Contract = require('./Contract');
const MeterReading = require('./MeterReading');
const Promotion = require('./Promotion');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const MaintenanceRequest = require('./MaintenanceRequest');
const Setting = require('./Setting');

module.exports = {
  sequelize,
  User,
  Property,
  Floor,
  RoomType,
  Room,
  Tenant,
  Contract,
  MeterReading,
  Promotion,
  Invoice,
  Payment,
  MaintenanceRequest,
  Setting
};
