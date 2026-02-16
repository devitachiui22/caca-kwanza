const router = require('express').Router();
const controller = require('../controllers/item.controller');
const auth = require('../middlewares/auth.middleware');

router.get('/nearby', auth, controller.getNearbyItems);
router.post('/capture', auth, controller.captureItem);

module.exports = router;