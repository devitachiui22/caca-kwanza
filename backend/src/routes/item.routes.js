const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * ==================================
 * CONFIGURAÇÃO
 * ==================================
 * Defina como true se quiser que /nearby seja protegido
 */
const PROTECT_NEARBY = true;

/**
 * ==================================
 * ROTAS
 * ==================================
 */

// Buscar itens próximos
if (PROTECT_NEARBY) {
  router.get('/nearby', authMiddleware, itemController.getNearbyItems);
} else {
  router.get('/nearby', itemController.getNearbyItems);
}

// Capturar item (sempre protegido)
router.post('/capture', authMiddleware, itemController.captureItem);

module.exports = router;
