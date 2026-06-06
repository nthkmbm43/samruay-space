const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');

router.use(protect);
router.use(checkPropertyStatus);
router.route('/')
  .get(tenantController.getAllTenants)
  .post(authorize('super_admin', 'admin'), tenantController.createTenant);

router.route('/:id')
  .put(authorize('super_admin', 'admin'), tenantController.updateTenant)
  .delete(authorize('super_admin', 'admin'), tenantController.deleteTenant);

module.exports = router;
