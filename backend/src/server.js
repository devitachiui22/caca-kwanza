const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// --- 1. Configurações de Segurança e Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100
});
app.use(limiter);

// --- 2. Importação de Rotas ---
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const itemRoutes = require('./routes/item.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const walletRoutes = require('./routes/wallet.routes');
const taxiRoutes = require('./routes/taxi.routes');
const deliveryRoutes = require('./routes/delivery.routes');

// --- 3. Definição de Rotas ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/taxi', taxiRoutes);
app.use('/api/delivery', deliveryRoutes);

// --- 4. Health Check ---
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    project: 'CaçaKwanza API',
    version: '1.0.0-production',
    modules: [
      'Auth',
      'User',
      'Items (Hunt)',
      'Marketplace',
      'Wallet',
      'Taxi',
      'Delivery'
    ],
    timestamp: new Date()
  });
});

// --- 5. Erro Global ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Ocorreu um erro interno no servidor.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// --- 6. Iniciar Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CaçaKwanza Backend rodando na porta ${PORT}`);
  console.log(`📡 Rotas ativas: /api/auth, /api/items, /api/marketplace, /api/wallet`);
});
