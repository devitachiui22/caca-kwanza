const db = require('../config/db');

// Solicitar Entrega
exports.requestDelivery = async (req, res) => {
    const { description, origin_lat, origin_lon, dest_lat, dest_lon } = req.body;
    const userId = req.user.id;

    try {
        // Preço fixo para teste: 500 Kz
        const price = 500;

        const result = await db.query(
            `INSERT INTO services (requester_id, type, status, origin_lat, origin_lon, dest_lat, dest_lon, price)
             VALUES ($1, 'delivery', 'pending', $2, $3, $4, $5, $6) RETURNING *`,
            [userId, origin_lat, origin_lon, dest_lat, dest_lon, price]
        );

        res.status(201).json({ message: 'Entrega solicitada!', delivery: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao solicitar entrega' });
    }
};

// Entregador aceita
exports.acceptDelivery = async (req, res) => {
    const { deliveryId } = req.body;
    const courierId = req.user.id;

    try {
        const result = await db.query(
            `UPDATE services SET provider_id = $1, status = 'accepted'
             WHERE id = $2 AND status = 'pending' RETURNING *`,
            [courierId, deliveryId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Entrega indisponível' });
        }

        res.json({ message: 'Entrega aceita!', delivery: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao aceitar entrega' });
    }
};

// Listar entregas pendentes
exports.getPendingDeliveries = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM services WHERE type = 'delivery' AND status = 'pending'");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar entregas' });
    }
};