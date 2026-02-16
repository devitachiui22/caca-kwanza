const db = require('../config/db');

// Listar itens próximos (Raio de 5km)
exports.getNearbyItems = async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitude e Longitude necessárias' });
  }

  try {
    // Fórmula Haversine SQL para calcular distância em KM
    const query = `
      SELECT id, name, type, rarity, latitude, longitude,
      ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) )
      * cos( radians( longitude ) - radians($2) ) + sin( radians($1) )
      * sin( radians( latitude ) ) ) ) AS distance
      FROM items
      WHERE active = true AND is_listed = false
      HAVING distance < 5
      ORDER BY distance ASC;
    `;

    // Nota: O "HAVING distance" direto requer CTE ou subquery em Postgres puro,
    // mas vamos simplificar filtrando no código se der erro no Neon free tier.
    // Abaixo versão simplificada compatível com Neon padrão:

    const rawData = await db.query('SELECT * FROM items WHERE active = true AND is_listed = false');

    // Filtragem JS para garantir compatibilidade sem extensões complexas
    const items = rawData.rows.map(item => {
        const R = 6371; // Raio da Terra km
        const dLat = (item.latitude - lat) * Math.PI / 180;
        const dLon = (item.longitude - lon) * Math.PI / 180;
        const a =
           Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat * Math.PI / 180) * Math.cos(item.latitude * Math.PI / 180) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        return { ...item, distance: d };
    }).filter(item => item.distance <= 2); // Retorna itens num raio de 2km

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar itens' });
  }
};

// CAPTURAR ITEM
exports.captureItem = async (req, res) => {
  const { itemId, lat, lon } = req.body;
  const userId = req.user.id;

  try {
    // 1. Verificar Item
    const itemResult = await db.query('SELECT * FROM items WHERE id = $1 AND active = true', [itemId]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: 'Item não encontrado ou já capturado.' });
    }
    const item = itemResult.rows[0];

    // 2. Verificar Distância (Backend Validation - Anti-Cheat básico)
    // Se o usuário estiver a mais de 100 metros (0.1km), bloqueia
    // Implementação simplificada aqui:
    const R = 6371;
    const dLat = (item.latitude - lat) * Math.PI / 180;
    const dLon = (item.longitude - lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(item.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (distance > 0.15) { // 150 metros de tolerância
        return res.status(400).json({ message: 'Você está muito longe do item!' });
    }

    // 3. Processar Captura (Transação)
    await db.query('BEGIN');

    // Desativar item (ou colocar em cooldown)
    await db.query('UPDATE items SET active = false, owner_id = $1 WHERE id = $2', [userId, itemId]);

    // Dar pontos e moedas
    const points = item.rarity === 'legendary' ? 500 : item.rarity === 'rare' ? 100 : 10;
    const coins = item.rarity === 'legendary' ? 50 : item.rarity === 'rare' ? 10 : 1;

    await db.query('UPDATE users SET points = points + $1, coins = coins + $2 WHERE id = $3', [points, coins, userId]);

    // Registrar Captura
    await db.query('INSERT INTO captures (user_id, item_id, points_earned) VALUES ($1, $2, $3)', [userId, itemId, points]);

    await db.query('COMMIT');

    res.json({ success: true, message: `Você capturou ${item.name}!`, earned: { points, coins } });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erro na captura' });
  }
};