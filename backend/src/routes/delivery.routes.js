const router = require('express').Router();
const controller = require('../controllers/services.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/request', auth, controller.requestService);
router.post('/accept', auth, controller.acceptService);
router.get('/available', auth, controller.getPendingServices);

module.exports = router;