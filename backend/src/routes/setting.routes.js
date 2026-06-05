const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { protect } = require('../middlewares/auth.middleware');

router.route('/')
  .get(protect, settingController.getSettings)
  .post(protect, settingController.updateSettings);

module.exports = router;
