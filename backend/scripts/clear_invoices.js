const { Payment, Invoice } = require('../src/models');
const sequelize = require('../src/config/database');

async function clearData() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Delete all payments first due to foreign key constraints
    await Payment.destroy({ where: {} });
    console.log('All payments deleted.');

    // Delete all invoices
    await Invoice.destroy({ where: {} });
    console.log('All invoices deleted.');

    console.log('Data cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Unable to clear data:', error);
    process.exit(1);
  }
}

clearData();
