const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { protect } = require('../middlewares/auth.middleware');

router.route('/')
  .get(protect, maintenanceController.getAllRequests)
  .post(protect, maintenanceController.createRequest);

module.exports = router;
