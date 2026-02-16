const express = require('express');
const router = express.Router();

const marketplaceController = require('../controllers/marketplace.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/*
==================================================
PRODUTOS DA LOJA (SISTEMA)
==================================================
*/

// Listar produtos da loja (protegido)
router.get('/products', authMiddleware, marketplaceController.getProducts);

// Comprar produto da loja
router.post('/products/buy', authMiddleware, marketplaceController.buyProduct);


/*
==================================================
MARKETPLACE ENTRE JOGADORES
==================================================
*/

// Listar itens à venda (público)
router.get('/', marketplaceController.getListings);

// Comprar item de outro jogador
router.post('/buy', authMiddleware, marketplaceController.buyItem);


module.exports = router;
