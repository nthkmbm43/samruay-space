const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.route('/')
  .get(protect, roomController.getAllRooms)
  .post(protect, authorize('super_admin', 'admin'), roomController.createRoom);

router.route('/:id')
  .get(protect, roomController.getRoomById)
  .put(protect, authorize('super_admin', 'admin'), roomController.updateRoom)
  .delete(protect, authorize('super_admin', 'admin'), roomController.deleteRoom);

module.exports = router;
