const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * GET /api/users/profile
 * Retorna dados do usuário + Estatísticas + Atividade Recente
 */
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // 1. Buscar Dados Básicos
        const userQuery = `
            SELECT id, name, email, points, coins, level, avatar_url, created_at
            FROM users WHERE id = $1
        `;
        const userRes = await db.query(userQuery, [userId]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Usuário não encontrado." });
        }

        // 2. Buscar Estatísticas de Jogo (Total capturado)
        const statsQuery = `
            SELECT COUNT(*) as total_captures, SUM(points_earned) as total_points_earned
            FROM captures WHERE user_id = $1
        `;
        const statsRes = await db.query(statsQuery, [userId]);

        // 3. Buscar Atividade Recente (Últimas 5)
        const historyQuery = `
            SELECT c.id, c.points_earned, c.coins_earned, c.captured_at, i.name as item_name
            FROM captures c
            LEFT JOIN items i ON c.item_id = i.id
            WHERE c.user_id = $1
            ORDER BY c.captured_at DESC
            LIMIT 5
        `;
        const historyRes = await db.query(historyQuery, [userId]);

        res.status(200).json({
            success: true,
            user: userRes.rows[0],
            stats: statsRes.rows[0],
            recent_activity: historyRes.rows
        });

    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/users/profile
 * Atualiza Nome, Senha ou Avatar
 */
exports.updateProfile = async (req, res, next) => {
    const { name, password, avatar_url } = req.body;
    const userId = req.user.id;

    try {
        // Validação básica
        if (!name && !password && !avatar_url) {
            return res.status(400).json({ success: false, message: "Nenhum dado para atualizar." });
        }

        // Atualização Dinâmica (Constrói a query baseada no que foi enviado)
        let fields = [];
        let values = [];
        let index = 1;

        if (name) {
            fields.push(`name = $${index++}`);
            values.push(name);
        }
        if (avatar_url) {
            fields.push(`avatar_url = $${index++}`);
            values.push(avatar_url);
        }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            fields.push(`password = $${index++}`);
            values.push(hash);
        }

        values.push(userId); // ID é o último parâmetro

        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`;
        await db.query(query, values);

        res.status(200).json({ success: true, message: "Perfil atualizado com sucesso!" });

    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/leaderboard
 * Top 20 Jogadores (Cacheado no banco seria ideal, aqui é real-time)
 */
exports.getLeaderboard = async (req, res, next) => {
    try {
        const query = `
            SELECT id, name, avatar_url, level, points
            FROM users
            ORDER BY points DESC
            LIMIT 20
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};