/**
 * ============================================================================
 * CAÇAKWANZA API SERVER - PRODUCTION BUILD
 * ============================================================================
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression'); // Comprime respostas JSON (Velocidade)
const morgan = require('morgan'); // Logger HTTP detalhado
require('dotenv').config();

// Inicialização do App
const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. SEGURANÇA E PERFORMANCE (MIDDLEWARES) ---

// Helmet: Protege contra vulnerabilidades comuns de web (XSS, Sniffing, etc)
app.use(helmet());

// CORS: Configuração estrita para permitir apenas seu frontend
app.use(cors({
    origin: '*', // Em produção real, mude para: ['https://seusite.com', 'capacitor://localhost']
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Rate Limit: Protege contra DDoS e Brute Force
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // Limite aumentado para uso real do app
    message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Compressão GZIP e Parser JSON
app.use(compression());
app.use(express.json({ limit: '1mb' })); // Proteção contra payloads gigantes
app.use(express.urlencoded({ extended: true }));

// Logger: Apenas mostra logs detalhados se não estiver em teste
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined')); 
}

// --- 2. ROTAS (MODULARES) ---

// Importação das Rotas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const itemRoutes = require('./routes/item.routes');
const marketRoutes = require('./routes/marketplace.routes');
const walletRoutes = require('./routes/wallet.routes');
const taxiRoutes = require('./routes/taxi.routes');
const deliveryRoutes = require('./routes/delivery.routes');

// Definição dos Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/marketplace', marketRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/taxi', taxiRoutes);
app.use('/api/delivery', deliveryRoutes);

// --- 3. HEALTH CHECK & MONITORAMENTO ---
app.get('/', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'CaçaKwanza API is Running',
        timestamp: Date.now(),
        env: process.env.NODE_ENV
    };
    try {
        res.status(200).send(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).send();
    }
});

// --- 4. TRATAMENTO DE ERROS GLOBAL (PREVINE CRASH) ---

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Rota não encontrada: ${req.originalUrl}`
    });
});

// Error Handler Centralizado
app.use((err, req, res, next) => {
    console.error('🔥 [SERVER ERROR]:', err);
    
    // Tratamento específico para erros comuns
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'JSON mal formatado.' });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Erro interno do servidor.';

    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// --- 5. INICIALIZAÇÃO DO SERVIDOR ---
const server = app.listen(PORT, () => {
    console.log(`
    ################################################
    🚀 CAÇAKWANZA BACKEND RODANDO
    ⭐️ Porta: ${PORT}
    ⭐️ Ambiente: ${process.env.NODE_ENV || 'development'}
    ################################################
    `);
});

// Graceful Shutdown (Para o Render não matar o processo abruptamente)
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido. Fechando servidor HTTP...');
    server.close(() => {
        console.log('Servidor HTTP fechado.');
        // Fechar pool de banco de dados aqui se necessário
        process.exit(0);
    });
});