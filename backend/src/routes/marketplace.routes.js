const router = require('express').Router();
const controller = require('../controllers/marketplace.controller');
const auth = require('../middlewares/auth.middleware');

// Sistema (Loja)
router.post('/products/buy', auth, controller.buySystemProduct);
// P2P (Players)
router.post('/listings/buy', auth, controller.buyP2PItem);

// Nota: A listagem de produtos pode ser implementada se necessário
// router.get('/products', auth, controller.getProducts);

module.exports = router;