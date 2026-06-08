const express = require('express');
const router = express.Router();
const moveOutController = require('../controllers/moveout.controller');
const { protect } = require('../middlewares/auth.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');

router.use(protect);
router.use(checkPropertyStatus);

router.route('/')
  .get(moveOutController.getAllRequests);

router.route('/:id/status')
  .put(moveOutController.updateRequestStatus);

module.exports = router;
