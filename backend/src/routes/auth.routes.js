const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/register-tenant', authController.registerTenant);
router.get('/me', protect, authController.me);
router.get('/setup', authController.setupAdmin);

module.exports = router;
