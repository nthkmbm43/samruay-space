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

router.route('/invoices/:id/payments')
  .post(protect, authorize('super_admin', 'admin'), billingController.recordPayment);

module.exports = router;
