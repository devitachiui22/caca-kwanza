const db = require('../config/db');
const GeoService = require('../services/geo.service');

/**
 * POST /api/[taxi|delivery]/request
 * Cria uma nova solicitação de serviço
 */
exports.requestService = async (req, res, next) => {
    const {
        origin_lat, origin_lon,
        dest_lat, dest_lon,
        pickup_address, dropoff_address,
        description, type // 'taxi' ou 'delivery'
    } = req.body;

    const userId = req.user.id;

    if (!origin_lat || !dest_lat || !type) {
        return res.status(400).json({ success: false, message: "Dados de localização incompletos." });
    }

    try {
        // 1. Calcular Distância e Preço Estimado (Lógica no Backend = Segurança)
        const distanceKm = GeoService.getDistanceFromLatLonInKm(origin_lat, origin_lon, dest_lat, dest_lon);
        const estimatedPrice = GeoService.calculateRidePrice(distanceKm);

        // 2. Inserir Solicitação
        const query = `
            INSERT INTO service_requests
            (requester_id, service_type, status, origin_lat, origin_lon, dest_lat, dest_lon, pickup_address, dropoff_address, description, estimated_price)
            VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, status, estimated_price, created_at
        `;

        const result = await db.query(query, [
            userId, type, origin_lat, origin_lon, dest_lat, dest_lon,
            pickup_address, dropoff_address, description, estimated_price
        ]);

        res.status(201).json({
            success: true,
            message: "Solicitação enviada! Procurando motoristas...",
            service: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/[taxi|delivery]/available
 * Lista serviços pendentes (Para o App do Motorista)
 */
exports.getPendingServices = async (req, res, next) => {
    const { type } = req.query; // 'taxi' ou 'delivery'

    try {
        // Busca apenas serviços pendentes num raio de X km seria o ideal
        // Aqui retornamos os últimos 20 pendentes globais por enquanto
        const query = `
            SELECT s.*, u.name as requester_name, u.avatar_url
            FROM service_requests s
            JOIN users u ON s.requester_id = u.id
            WHERE s.service_type = $1 AND s.status = 'pending'
            ORDER BY s.created_at DESC
            LIMIT 20
        `;

        const result = await db.query(query, [type || 'taxi']);
        res.status(200).json(result.rows);

    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/[taxi|delivery]/accept
 * Motorista aceita a corrida (Transação Atômica para evitar conflito)
 */
exports.acceptService = async (req, res, next) => {
    const { serviceId } = req.body;
    const driverId = req.user.id;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Lock na linha para evitar que 2 motoristas aceitem ao mesmo tempo
        const checkQuery = `SELECT id FROM service_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`;
        const checkRes = await client.query(checkQuery, [serviceId]);

        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: "Corrida não está mais disponível." });
        }

        // Atualiza status e define motorista
        const updateQuery = `
            UPDATE service_requests
            SET status = 'accepted', provider_id = $1, started_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const updateRes = await client.query(updateQuery, [driverId, serviceId]);

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: "Corrida aceita!",
            service: updateRes.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};