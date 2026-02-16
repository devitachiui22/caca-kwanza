const router = require('express').Router();
const taxiController = require('../controllers/taxi.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/request', authMiddleware, taxiController.requestRide);
router.post('/accept', authMiddleware, taxiController.acceptRide);
router.get('/available', authMiddleware, taxiController.getAvailableRides);

module.exports = router;