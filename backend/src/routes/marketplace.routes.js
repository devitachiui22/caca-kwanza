const router = require('express').Router();
const marketController = require('../controllers/marketplace.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', marketController.getListings);
router.post('/buy', authMiddleware, marketController.buyItem);

module.exports = router;