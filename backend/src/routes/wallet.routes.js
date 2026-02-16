const express = require('express');
const router = express.Router();
const controller = require('../controllers/wallet.controller');
const auth = require('../middlewares/auth.middleware');

router.get('/balance', auth, controller.getBalance);
router.get('/transactions', auth, controller.getTransactions);

module.exports = router;
