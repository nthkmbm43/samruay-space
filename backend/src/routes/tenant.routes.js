const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { protect } = require('../middlewares/auth.middleware');

router.route('/')
  .get(protect, tenantController.getAllTenants)
  .post(protect, tenantController.createTenant);

router.route('/:id')
  .put(protect, tenantController.updateTenant);

module.exports = router;
