require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../src/models');
const { Op } = require('sequelize');
const { 
  Payment, 
  Invoice, 
  MeterReading, 
  MaintenanceRequest, 
  Notification, 
  Contract, 
  Tenant, 
  Room, 
  Floor, 
  RoomType, 
  Property, 
  Promotion, 
  User 
} = require('../src/models');

async function clearAll() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Disable foreign key checks for easier deletion, or delete in strict order
    // In PostgreSQL / Sequelize, we can just delete in the right order.

    console.log('Clearing payments...');
    await Payment.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing invoices...');
    await Invoice.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing meter readings...');
    await MeterReading.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing maintenance requests...');
    await MaintenanceRequest.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing notifications...');
    if (Notification) await Notification.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});

    console.log('Clearing contracts...');
    if (Contract) await Contract.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});

    console.log('Clearing tenants...');
    await Tenant.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing rooms...');
    await Room.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing floors...');
    if (Floor) await Floor.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});

    console.log('Clearing room types...');
    if (RoomType) await RoomType.destroy({ where: {}, truncate: true, cascade: true }).catch(() => {});

    console.log('Clearing properties...');
    await Property.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing promotions...');
    await Promotion.destroy({ where: {}, truncate: true, cascade: true });

    console.log('Clearing non-admin users...');
    await User.destroy({ 
      where: { 
        role: { [Op.ne]: 'admin' }
      }
    });

    console.log('Database successfully cleared! Only admin and settings remain.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearAll();
