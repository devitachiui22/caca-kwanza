const router = require('express').Router();
const itemController = require('../controllers/item.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/nearby', itemController.getNearbyItems); // Público ou Protegido, você decide
router.post('/capture', authMiddleware, itemController.captureItem);

module.exports = router;