const { Pool } = require('pg');
require('dotenv').config();

// Configuração otimizada para Serverless/Cloud (Render + Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Obrigatório para Neon DB
  },
  max: 20, // Limite de conexões simultâneas
  idleTimeoutMillis: 30000, // Tempo para fechar conexão ociosa
  connectionTimeoutMillis: 5000, // Tempo limite para tentar conectar
});

// Listeners de eventos para monitoramento
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 [DB] Nova conexão estabelecida com o Pool.');
  }
});

pool.on('error', (err, client) => {
  console.error('🔥 [DB CRITICAL] Erro inesperado no cliente inativo.', err);
  process.exit(-1); // Encerra o processo para o Docker reiniciar
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool // Exporta o pool para transações (client.connect)
};