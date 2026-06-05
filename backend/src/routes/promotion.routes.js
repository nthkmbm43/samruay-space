const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../public/uploads/promotions');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `promo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.route('/')
  .get(protect, authorize('super_admin', 'admin'), promotionController.getAllPromotions)
  .post(protect, authorize('super_admin', 'admin'), upload.single('image'), promotionController.createPromotion);

router.route('/:id')
  .delete(protect, authorize('super_admin', 'admin'), promotionController.deletePromotion);

router.route('/:id/broadcast')
  .post(protect, authorize('super_admin', 'admin'), promotionController.broadcastPromotion);

module.exports = router;
