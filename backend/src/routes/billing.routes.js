const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.route('/invoices')
  .get(protect, billingController.getAllInvoices);

router.route('/invoices/generate')
  .post(protect, authorize('super_admin', 'admin'), billingController.generateInvoices);

router.route('/invoices/:id')
  .get(protect, billingController.getInvoiceById);

router.route('/meters')
  .get(protect, billingController.getMeters)
  .post(protect, authorize('super_admin', 'admin'), billingController.recordMeters);

router.route('/invoices/:id/payments')
  .post(protect, authorize('super_admin', 'admin'), billingController.recordPayment);

router.route('/invoices/:id/verify')
  .put(protect, authorize('super_admin', 'admin'), billingController.verifyInvoice);

module.exports = router;
