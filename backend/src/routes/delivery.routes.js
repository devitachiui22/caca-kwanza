const router = require('express').Router();
const deliveryController = require('../controllers/delivery.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/request', authMiddleware, deliveryController.requestDelivery);
router.post('/accept', authMiddleware, deliveryController.acceptDelivery);
router.get('/pending', authMiddleware, deliveryController.getPendingDeliveries);

module.exports = router;