const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// --- 1. Configurações de Segurança e Middleware ---
app.use(helmet()); // Proteção de headers HTTP
app.use(cors());   // Permite requisições do Flutter Web/Mobile
app.use(express.json()); // Permite ler JSON no body das requisições

// Limiter para evitar ataques de força bruta ou DDoS simples
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
});
app.use(limiter);

// --- 2. Importação de Rotas ---
// Certifique-se que todos esses arquivos existem na pasta /routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const itemRoutes = require('./routes/item.routes');
const marketplaceRoutes = require('./routes/marketplace.routes'); // Atualizado
const walletRoutes = require('./routes/wallet.routes');           // NOVO (Carteira)
const taxiRoutes = require('./routes/taxi.routes');               // Placeholder
const deliveryRoutes = require('./routes/delivery.routes');       // Placeholder

// --- 3. Definição de Rotas (Endpoints) ---
// O prefixo '/api' é fundamental para bater com o ApiEndpoints do Flutter

app.use('/api/auth', authRoutes);
// Login: /api/auth/login

app.use('/api/users', userRoutes); 
// Perfil: /api/users/profile (Atenção: No Flutter usamos /users, não /user)

app.use('/api/items', itemRoutes);
// Itens próximos: /api/items/nearby

app.use('/api/marketplace', marketplaceRoutes);
// Produtos: /api/marketplace/products

app.use('/api/wallet', walletRoutes);
// Saldo: /api/wallet/balance

app.use('/api/taxi', taxiRoutes);
// Futuro: /api/taxi/request

app.use('/api/delivery', deliveryRoutes);
// Futuro: /api/delivery/orders

// --- 4. Rota de Health Check (Verificação) ---
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

// --- 5. Tratamento de Erros Global ---
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
