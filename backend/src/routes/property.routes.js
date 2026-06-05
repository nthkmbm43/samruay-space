const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.route('/')
  .get(protect, propertyController.getAllProperties)
  .post(protect, authorize('super_admin', 'admin'), propertyController.createProperty);

router.route('/:id')
  .get(protect, propertyController.getPropertyById)
  .put(protect, authorize('super_admin', 'admin'), propertyController.updateProperty);

module.exports = router;
