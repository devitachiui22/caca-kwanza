const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- Middlewares ---
app.use(express.json()); // Aceitar JSON no body
app.use(cors()); // Habilitar acesso externo (Flutter/Web)

// --- Importação de Rotas ---
const authRoutes = require('./routes/auth.routes');

// --- Definição de Rotas ---
app.use('/api/auth', authRoutes);

// --- Rota de Teste (Health Check) ---
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        project: 'CaçaKwanza API',
        version: '1.0.0',
        maintainer: 'Equipe CaçaKwanza',
        timestamp: new Date()
    });
});

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CaçaKwanza Backend rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});