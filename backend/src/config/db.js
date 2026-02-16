const { Pool } = require('pg');
require('dotenv').config();

// Configuração robusta para Produção (Render + Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Essencial para conexão SSL no Neon via Node
  }
});

pool.on('connect', () => {
  console.log('✅ [DB] Conectado ao Neon PostgreSQL com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ [DB] Erro inesperado no cliente inativo', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};