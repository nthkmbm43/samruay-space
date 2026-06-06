const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');

router.use(protect);
router.use(checkPropertyStatus);
router.route('/invoices')
  .get(billingController.getAllInvoices);

router.route('/invoices/preview')
  .post(authorize('super_admin', 'admin'), billingController.previewInvoices);

router.route('/invoices/generate')
  .post(authorize('super_admin', 'admin'), billingController.generateInvoices);

router.route('/invoices/:id')
  .get(billingController.getInvoiceById);

router.route('/meters')
  .get(billingController.getMeters)
  .post(authorize('super_admin', 'admin'), billingController.recordMeters);

router.route('/meters/period')
  .get(authorize('super_admin', 'admin'), billingController.getMeterReadingsForPeriod);

router.route('/invoices/:id/payments')
  .post(authorize('super_admin', 'admin'), billingController.recordPayment);

router.route('/invoices/:id/verify')
  .put(authorize('super_admin', 'admin'), billingController.verifyInvoice);

module.exports = router;
