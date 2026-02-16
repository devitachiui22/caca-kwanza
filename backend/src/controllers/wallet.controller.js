const db = require('../config/db');

/**
 * GET /api/wallet/balance
 * Saldo atualizado
 */
exports.getBalance = async (req, res, next) => {
    try {
        const result = await db.query('SELECT coins, points FROM users WHERE id = $1', [req.user.id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/wallet/transactions
 * Histórico com Paginação
 */
exports.getTransactions = async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        const query = `
            SELECT id, amount, type, description, created_at
            FROM transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [req.user.id, limit, offset]);

        // Contar total para paginação no front
        const countRes = await db.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [req.user.id]);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countRes.rows[0].count),
                page,
                limit
            }
        });
    } catch (error) {
        next(error);
    }
};