const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { protect } = require('../middlewares/auth.middleware');

router.route('/')
  .get(protect, maintenanceController.getAllRequests)
  .post(protect, maintenanceController.createRequest);

router.route('/:id/status')
  .patch(protect, maintenanceController.updateRequestStatus);

module.exports = router;
