const db = require('../config/db');

// Obter Perfil do Usuário Logado
exports.getProfile = async (req, res) => {
  try {
    const user = await db.query(
      'SELECT id, name, email, points, coins, level, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    // Buscar histórico recente
    const history = await db.query(
      'SELECT * FROM captures WHERE user_id = $1 ORDER BY captured_at DESC LIMIT 5',
      [req.user.id]
    );

    res.json({ user: user.rows[0], recent_activity: history.rows });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
};

// Ranking Global (Top 10)
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await db.query(
      'SELECT name, points, level FROM users ORDER BY points DESC LIMIT 10'
    );
    res.json(leaderboard.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar ranking' });
  }
};