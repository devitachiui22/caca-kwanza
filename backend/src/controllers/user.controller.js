const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Obter perfil completo do usuário logado, incluindo histórico recente
exports.getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    // Dados do usuário
    const userResult = await db.query(
      'SELECT id, name, email, points, coins, level, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Histórico recente (últimas 5 capturas)
    const historyResult = await db.query(
      'SELECT * FROM captures WHERE user_id = $1 ORDER BY captured_at DESC LIMIT 5',
      [userId]
    );

    res.json({
      user: userResult.rows[0],
      recent_activity: historyResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
};

// Atualizar perfil do usuário (nome e senha)
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, password } = req.body;

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 8);
      await db.query(
        'UPDATE users SET name = $1, password = $2 WHERE id = $3',
        [name, hashedPassword, userId]
      );
    } else {
      await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    }

    res.json({ message: "Perfil atualizado com sucesso" });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
};

// Ranking global (Top 10 usuários por pontos)
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboardResult = await db.query(
      'SELECT name, points, level FROM users ORDER BY points DESC LIMIT 10'
    );

    res.json(leaderboardResult.rows);
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ message: 'Erro ao buscar ranking' });
  }
};
