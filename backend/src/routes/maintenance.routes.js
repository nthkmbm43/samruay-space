const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { checkPropertyStatus } = require('../middlewares/property.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/maintenance');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `admin-maint-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.use(protect);
router.use(checkPropertyStatus);

router.route('/')
  .get(maintenanceController.getAllRequests)
  .post(maintenanceController.createRequest);

router.route('/:id')
  .get(maintenanceController.getRequestById)
  .put(maintenanceController.updateRequest)
  .delete(authorize('super_admin', 'admin'), maintenanceController.deleteRequest);

router.route('/:id/status')
  .patch(upload.single('image'), maintenanceController.updateRequestStatus);

module.exports = router;
