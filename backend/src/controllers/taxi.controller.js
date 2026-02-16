const db = require('../config/db');
const GeoService = require('../services/geo.service');

// Pedir um Táxi
exports.requestRide = async (req, res) => {
    const { origin_lat, origin_lon, dest_lat, dest_lon } = req.body;
    const userId = req.user.id;

    try {
        // Calcular preço estimado (Ex: 50 Kz base + 100 Kz por Km)
        const distance = GeoService.getDistanceFromLatLonInKm(origin_lat, origin_lon, dest_lat, dest_lon);
        const estimatedPrice = Math.floor(50 + (distance * 100));

        const result = await db.query(
            `INSERT INTO services (requester_id, type, status, origin_lat, origin_lon, dest_lat, dest_lon, price)
             VALUES ($1, 'taxi', 'pending', $2, $3, $4, $5, $6) RETURNING *`,
            [userId, origin_lat, origin_lon, dest_lat, dest_lon, estimatedPrice]
        );

        res.status(201).json({ message: 'Táxi solicitado!', ride: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao solicitar táxi' });
    }
};

// Motorista aceita corrida
exports.acceptRide = async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user.id;

    try {
        const result = await db.query(
            `UPDATE services SET provider_id = $1, status = 'accepted'
             WHERE id = $2 AND status = 'pending' RETURNING *`,
            [driverId, rideId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Corrida não disponível' });
        }

        res.json({ message: 'Corrida aceita!', ride: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao aceitar corrida' });
    }
};

// Listar corridas disponíveis (para motoristas)
exports.getAvailableRides = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM services WHERE type = 'taxi' AND status = 'pending'");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar corridas' });
    }
};