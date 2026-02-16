const db = require('../config/db');

// Obter saldo e resumo
exports.getBalance = async (req, res) => {
  const userId = req.user.id;
  try {
    const userRes = await db.query('SELECT coins, points FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json(userRes.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar saldo" });
  }
};

// Obter histórico de transações
exports.getTransactions = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar transações" });
  }
};
