const db = require('../config/db');
const GeoService = require('../services/geo.service');

/**
 * Configurações de Gameplay
 */
const GAME_CONFIG = {
    MAX_CAPTURE_DISTANCE_KM: 0.1, // 100 metros
    SEARCH_RADIUS_KM: 3.0, // Raio de busca no mapa
    XP_MULTIPLIER: 1.2, // Multiplicador de nível
};

/**
 * HELPERS
 */
const calculateNextLevelXp = (currentLevel) => {
    // Fórmula exponencial: Nível 1 = 1000xp, Nível 2 = 1200xp, etc.
    return Math.floor(1000 * Math.pow(GAME_CONFIG.XP_MULTIPLIER, currentLevel - 1));
};

/**
 * [GET] /api/items/nearby
 * Busca itens num raio X do usuário que AINDA NÃO FORAM CAPTURADOS por ele.
 * Otimizado com fórmula Haversine no banco de dados.
 */
exports.getNearbyItems = async (req, res, next) => {
    const { lat, lng } = req.query;
    const userId = req.user.id;

    if (!lat || !lng) {
        return res.status(400).json({ success: false, message: "Latitude e Longitude obrigatórias." });
    }

    try {
        const query = `
            SELECT
                i.id, i.name, i.type, i.rarity, i.latitude, i.longitude, i.image_url,
                i.base_value_coins, i.base_xp_reward,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($2)) +
                        sin(radians($1)) * sin(radians(i.latitude))
                    )
                ) AS distance_km
            FROM items i
            WHERE
                i.active = true
                AND i.owner_id IS NULL -- Apenas itens do sistema (não P2P)
                AND i.id NOT IN (
                    SELECT item_id FROM captures WHERE user_id = $3
                )
                AND (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($2)) +
                        sin(radians($1)) * sin(radians(i.latitude))
                    )
                ) <= $4
            ORDER BY distance_km ASC
            LIMIT 50;
        `;

        const result = await db.query(query, [lat, lng, userId, GAME_CONFIG.SEARCH_RADIUS_KM]);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            items: result.rows
        });

    } catch (error) {
        console.error("❌ [MAP ERROR]:", error);
        next(error);
    }
};

/**
 * [POST] /api/items/capture
 * Lógica Crítica: Captura o item, previne duplicidade e dá recompensas.
 */
exports.captureItem = async (req, res, next) => {
    const { itemId, lat, lng } = req.body;
    const userId = req.user.id;

    if (!itemId || !lat || !lng) {
        return res.status(400).json({ success: false, message: "Dados incompletos." });
    }

    const client = await db.pool.connect(); // Cliente dedicado para Transação

    try {
        await client.query('BEGIN'); // Inicia Transação ACID

        // 1. SELECT FOR UPDATE (Lock Pessimista)
        // Isso impede que dois usuários capturem o mesmo item ao mesmo tempo
        const itemRes = await client.query(
            `SELECT * FROM items WHERE id = $1 AND active = true AND owner_id IS NULL FOR UPDATE`,
            [itemId]
        );

        if (itemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Item não disponível ou já capturado." });
        }
        const item = itemRes.rows[0];

        // 2. Verificar se o usuário já tem esse item (Dupla checagem)
        const checkCapture = await client.query(
            'SELECT id FROM captures WHERE user_id = $1 AND item_id = $2',
            [userId, itemId]
        );
        if (checkCapture.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "Você já possui este item." });
        }

        // 3. ANTI-CHEAT: Validar Distância Servidor-Lado
        const distance = GeoService.getDistanceFromLatLonInKm(lat, lng, item.latitude, item.longitude);

        if (distance > GAME_CONFIG.MAX_CAPTURE_DISTANCE_KM) {
            console.warn(`⚠️ [ANTI-CHEAT] User ${userId} tentou capturar item ${itemId} a ${distance}km de distância.`);
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: "Você está muito longe do item para capturá-lo." });
        }

        // 4. Calcular Recompensas (Raridade Multiplica)
        let xpReward = item.base_xp_reward;
        let coinsReward = item.base_value_coins;

        if (item.rarity === 'legendary') { xpReward *= 5; coinsReward *= 10; }
        else if (item.rarity === 'epic') { xpReward *= 3; coinsReward *= 5; }
        else if (item.rarity === 'rare') { xpReward *= 2; coinsReward *= 2; }

        // 5. Atualizar Usuário e Verificar Level Up
        const userRes = await client.query('SELECT points, level, xp_to_next_level FROM users WHERE id = $1 FOR UPDATE', [userId]);
        let { points, level, xp_to_next_level } = userRes.rows[0];

        // Adiciona XP/Coins
        points = (points ? parseInt(points) : 0) + xpReward;

        // Lógica de Level Up
        let leveledUp = false;
        if (points >= xp_to_next_level) {
            level++;
            xp_to_next_level = calculateNextLevelXp(level);
            leveledUp = true;
        }

        // Executar Updates no Banco
        await client.query(
            'UPDATE users SET points = $1, coins = coins + $2, level = $3, xp_to_next_level = $4 WHERE id = $5',
            [points, coinsReward, level, xp_to_next_level, userId]
        );

        // Desativar Item no Mapa e Definir Dono
        await client.query(
            'UPDATE items SET active = false, owner_id = $1, last_captured_at = NOW() WHERE id = $2',
            [userId, itemId]
        );

        // Registrar Captura (Audit Log)
        await client.query(
            `INSERT INTO captures (user_id, item_id, points_earned, coins_earned, player_lat, player_lon)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, itemId, xpReward, coinsReward, lat, lng]
        );

        // Registrar Transação Financeira (Coins)
        if (coinsReward > 0) {
            await client.query(
                `INSERT INTO transactions (user_id, amount, type, description, related_item_id)
                 VALUES ($1, $2, 'capture_reward', $3, $4)`,
                [userId, coinsReward, `Recompensa: ${item.name}`, itemId]
            );
        }

        await client.query('COMMIT'); // Salva Tudo

        res.status(200).json({
            success: true,
            message: leveledUp ? `Level Up! Você chegou ao nível ${level}!` : "Captura realizada com sucesso!",
            data: {
                item: item.name,
                rarity: item.rarity,
                earned: { xp: xpReward, coins: coinsReward },
                newLevel: level,
                leveledUp: leveledUp
            }
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Desfaz tudo se der erro
        console.error("❌ [CAPTURE ERROR]:", error);
        next(error);
    } finally {
        client.release(); // Libera conexão para o Pool
    }
};