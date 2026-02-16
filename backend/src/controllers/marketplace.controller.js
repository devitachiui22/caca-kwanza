const db = require('../config/db');

/*
==================================================
LISTAR ITENS À VENDA
==================================================
*/
exports.getListings = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM items
      WHERE is_listed = true AND active = true
      ORDER BY created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erro ao listar marketplace:", error);
    res.status(500).json({ message: 'Erro ao listar mercado' });
  }
};

/*
==================================================
COMPRAR ITEM (TRANSAÇÃO ATÔMICA E SEGURA)
==================================================
*/
exports.buyItem = async (req, res) => {
  const { itemId } = req.body;
  const buyerId = req.user.id;

  if (!itemId) {
    return res.status(400).json({ message: "ID do item é obrigatório" });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Buscar item com LOCK
    const itemRes = await client.query(
      `SELECT * FROM items WHERE id=$1 AND is_listed=true AND active=true FOR UPDATE`,
      [itemId]
    );

    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item indisponível' });
    }

    const item = itemRes.rows[0];
    const sellerId = item.owner_id;
    const price = item.price;

    if (buyerId === sellerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Você não pode comprar seu próprio item' });
    }

    // 2️⃣ Lock comprador
    const buyerRes = await client.query(
      'SELECT coins FROM users WHERE id=$1 FOR UPDATE',
      [buyerId]
    );

    if (buyerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const buyer = buyerRes.rows[0];
    if (buyer.coins < price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Saldo insuficiente' });
    }

    // 3️⃣ Lock vendedor
    const sellerRes = await client.query(
      'SELECT coins FROM users WHERE id=$1 FOR UPDATE',
      [sellerId]
    );

    if (sellerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vendedor não encontrado' });
    }

    // 4️⃣ Transferência de moedas e item
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, buyerId]);
    await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [price, sellerId]);
    await client.query(
      'UPDATE items SET owner_id=$1, is_listed=false, price=0 WHERE id=$2',
      [buyerId, itemId]
    );

    // 5️⃣ Registrar transações
    await client.query(
      'INSERT INTO transactions (user_id, amount, description, type) VALUES ($1,$2,$3,$4)',
      [buyerId, -price, `Compra Marketplace: ${item.name}`, 'market_buy']
    );
    await client.query(
      'INSERT INTO transactions (user_id, amount, description, type) VALUES ($1,$2,$3,$4)',
      [sellerId, price, `Venda Marketplace: ${item.name}`, 'market_sell']
    );

    // 6️⃣ Criar registro de pedido
    await client.query(
      'INSERT INTO orders (user_id, product_id, price_paid, status) VALUES ($1,$2,$3,$4)',
      [buyerId, itemId, price, 'completed']
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Compra realizada com sucesso!',
      newBalance: buyer.coins - price
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro na compra marketplace:", error);
    res.status(500).json({ message: 'Erro ao processar compra' });
  } finally {
    client.release();
  }
};
