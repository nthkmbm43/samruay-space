const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(protect);
router.use(authorize('super_admin'));

router.route('/properties')
  .get(adminController.getAllProperties)
  .post(adminController.createProperty);

router.route('/properties/:id/status')
  .put(adminController.updatePropertyStatus);

router.route('/users')
  .get(adminController.getAllUsers);

router.route('/users/:id/role')
  .put(adminController.updateUserRole);

router.route('/system/maintenance')
  .put(adminController.toggleMaintenanceMode);

module.exports = router;
