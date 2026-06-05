const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: '../.env' }); // Load .env from root

const sequelize = require('./src/config/database');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
// Webhook routes must be defined before body parsers so the raw body is available for signature verification
const webhookRoutes = require('./src/routes/webhook.routes');
app.use('/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads and pdfs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// Routes
const authRoutes = require('./src/routes/auth.routes');
const propertyRoutes = require('./src/routes/property.routes');
const roomRoutes = require('./src/routes/room.routes');
const tenantRoutes = require('./src/routes/tenant.routes');
const billingRoutes = require('./src/routes/billing.routes');
const maintenanceRoutes = require('./src/routes/maintenance.routes');
const settingRoutes = require('./src/routes/setting.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const lineRoutes = require('./src/routes/line.routes');
const promotionRoutes = require('./src/routes/promotion.routes');

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SAMRUAY SPACE API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/line', lineRoutes);
app.use('/api/promotions', promotionRoutes);

// Sync Database and Start Server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Note: Do not use force: true in production!
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    // Sync models
    require('./src/models');
    await sequelize.sync({ alter: true });
    
    // Start Cron Jobs
    require('./src/jobs/cancelReservation');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
