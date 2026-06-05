const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '../.env' }); // Assuming .env is at root

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dormitory_db',
  process.env.DB_USER || 'dorm_user',
  process.env.DB_PASS || 'your-db-password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
