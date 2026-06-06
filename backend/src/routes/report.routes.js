const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');

router.use(protect);
router.use(checkPropertyStatus);
router.use(authorize('super_admin', 'admin'));

router.route('/dashboard')
  .get(reportController.getDashboardData);

router.route('/statistics')
  .get(reportController.getReportsStatistics);

module.exports = router;

