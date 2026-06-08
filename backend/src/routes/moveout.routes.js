const express = require('express');
const router = express.Router();
const moveOutController = require('../controllers/moveout.controller');
const { protect } = require('../middlewares/auth.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');

router.get('/debug-unprotected', async (req, res) => {
  try {
    const { MoveOutRequest, Room, Tenant, User } = require('../models');
    const requests = await MoveOutRequest.findAll({
      include: [
        { model: Room, as: 'room' },
        { model: Tenant, as: 'tenant', include: [{ model: User, as: 'user' }] }
      ]
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.use(protect);
router.use(checkPropertyStatus);

router.route('/')
  .get(moveOutController.getAllRequests);

router.route('/:id/status')
  .put(moveOutController.updateRequestStatus);

module.exports = router;
