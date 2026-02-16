const express = require('express');
const router = express.Router();

const marketplaceController = require('../controllers/marketplace.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/*
==================================================
PRODUTOS DA LOJA (SISTEMA)
==================================================
*/
router.get('/products', authMiddleware, marketplaceController.getProducts);
router.post('/products/buy', authMiddleware, marketplaceController.buyProduct);

/*
==================================================
MARKETPLACE ENTRE JOGADORES
==================================================
*/
router.get('/', marketplaceController.getListings);
router.post('/buy', authMiddleware, marketplaceController.buyItem);

module.exports = router;
