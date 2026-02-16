const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// --- Configurações de Segurança e Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());

// Limiter para evitar abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// --- Importação de Rotas ---
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const itemRoutes = require('./routes/item.routes');
const marketRoutes = require('./routes/marketplace.routes');
const taxiRoutes = require('./routes/taxi.routes');       // Novo
const deliveryRoutes = require('./routes/delivery.routes'); // Novo

// --- Definição de Rotas (Endpoints) ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/taxi', taxiRoutes);         // Novo
app.use('/api/delivery', deliveryRoutes); // Novo

// --- Rota de Verificação ---
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        project: 'CaçaKwanza API',
        version: '1.0.0-full',
        modules: ['Auth', 'User', 'Items', 'Market', 'Taxi', 'Delivery']
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CaçaKwanza Backend Completo rodando na porta ${PORT}`);
});