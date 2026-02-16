const db = require('../config/db');

/**
 * ===============================
 * BUSCAR ITENS PRÓXIMOS (FULL)
 * ===============================
 */
exports.getNearbyItems = async (req, res) => {
  const { lat, lng, radius } = req.query;
  const userId = req.user.id;

  const radiusKm = radius ? parseFloat(radius) : 2.0; // padrão 2km

  if (!lat || !lng) {
    return res.status(400).json({ message: "Latitude e Longitude são obrigatórias" });
  }

  try {
    const query = `
      SELECT i.id, i.name, i.type, i.rarity, i.latitude, i.longitude,
      (6371 * acos(
        cos(radians($1)) * cos(radians(i.latitude)) *
        cos(radians(i.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(i.latitude))
      )) AS distance
      FROM items i
      WHERE i.active = true
      AND i.is_listed = false
      AND i.id NOT IN (
        SELECT item_id FROM captures WHERE user_id = $3
      )
      AND (6371 * acos(
        cos(radians($1)) * cos(radians(i.latitude)) *
        cos(radians(i.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(i.latitude))
      )) <= $4
      ORDER BY distance ASC
      LIMIT 30;
    `;

    const result = await db.query(query, [lat, lng, userId, radiusKm]);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar itens próximos" });
  }
};


/**
 * ===============================
 * CAPTURAR ITEM (FULL + ANTI-CHEAT)
 * ===============================
 */
exports.captureItem = async (req, res) => {
  const { itemId, lat, lng } = req.body;
  const userId = req.user.id;

  if (!itemId || !lat || !lng) {
    return res.status(400).json({ message: "Dados incompletos para captura" });
  }

  try {
    await db.query('BEGIN');

    /**
     * 1️⃣ Buscar item e travar linha (FOR UPDATE evita captura dupla simultânea)
     */
    const itemResult = await db.query(
      'SELECT * FROM items WHERE id = $1 AND active = true FOR UPDATE',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: "Item não encontrado ou já capturado." });
    }

    const item = itemResult.rows[0];

    /**
     * 2️⃣ Verificar se já capturou
     */
    const alreadyCaptured = await db.query(
      'SELECT 1 FROM captures WHERE user_id = $1 AND item_id = $2',
      [userId, itemId]
    );

    if (alreadyCaptured.rows.length > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: "Você já capturou este item!" });
    }

    /**
     * 3️⃣ Verificação de distância (ANTI-CHEAT)
     * Limite: 150 metros
     */
    const R = 6371;
    const dLat = (item.latitude - lat) * Math.PI / 180;
    const dLon = (item.longitude - lng) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * Math.PI / 180) *
      Math.cos(item.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance > 0.15) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: "Você está muito longe do item!" });
    }

    /**
     * 4️⃣ Definir recompensa por raridade
     */
    let points = 10;
    let coins = 1;

    if (item.rarity === 'rare') {
      points = 100;
      coins = 10;
    }

    if (item.rarity === 'legendary') {
      points = 500;
      coins = 50;
    }

    /**
     * 5️⃣ Desativar item e definir dono
     */
    await db.query(
      'UPDATE items SET active = false, owner_id = $1 WHERE id = $2',
      [userId, itemId]
    );

    /**
     * 6️⃣ Atualizar usuário
     */
    await db.query(
      'UPDATE users SET points = points + $1, coins = coins + $2 WHERE id = $3',
      [points, coins, userId]
    );

    /**
     * 7️⃣ Registrar captura
     */
    await db.query(
      'INSERT INTO captures (user_id, item_id, points_earned) VALUES ($1, $2, $3)',
      [userId, itemId, points]
    );

    await db.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Você capturou ${item.name}!`,
      earned: {
        points,
        coins
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: "Erro ao processar captura" });
  }
};
