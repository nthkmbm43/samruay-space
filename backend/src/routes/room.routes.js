const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');

router.use(protect);
router.use(checkPropertyStatus);
router.route('/')
  .get(roomController.getAllRooms)
  .post(authorize('super_admin', 'admin'), roomController.createRoom);

router.route('/:id')
  .get(roomController.getRoomById)
  .put(authorize('super_admin', 'admin'), roomController.updateRoom)
  .delete(authorize('super_admin', 'admin'), roomController.deleteRoom);

module.exports = router;
