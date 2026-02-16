const db = require('../config/db');

// Listar itens à venda
exports.getListings = async (req, res) => {
  try {
    const items = await db.query(
      'SELECT * FROM items WHERE is_listed = true AND active = true ORDER BY created_at DESC'
    );
    res.json(items.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar mercado' });
  }
};

// Comprar Item
exports.buyItem = async (req, res) => {
  const { itemId } = req.body;
  const buyerId = req.user.id;

  try {
    const itemRes = await db.query('SELECT * FROM items WHERE id = $1 AND is_listed = true', [itemId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ message: 'Item indisponível' });

    const item = itemRes.rows[0];
    const sellerId = item.owner_id;
    const price = item.price;

    if (buyerId === sellerId) return res.status(400).json({ message: 'Você não pode comprar seu próprio item' });

    // Verificar Saldo
    const buyerRes = await db.query('SELECT coins FROM users WHERE id = $1', [buyerId]);
    if (buyerRes.rows[0].coins < price) {
        return res.status(400).json({ message: 'Saldo insuficiente' });
    }

    // Transação
    await db.query('BEGIN');

    // Tirar dinheiro do comprador
    await db.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, buyerId]);

    // Dar dinheiro ao vendedor
    await db.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [price, sellerId]);

    // Transferir Item
    await db.query('UPDATE items SET owner_id = $1, is_listed = false, price = 0 WHERE id = $2', [buyerId, itemId]);

    // Registrar Transação
    await db.query("INSERT INTO transactions (user_id, amount, description, type) VALUES ($1, $2, 'Compra Marketplace', 'market_buy')", [buyerId, -price]);
    await db.query("INSERT INTO transactions (user_id, amount, description, type) VALUES ($1, $2, 'Venda Marketplace', 'market_sell')", [sellerId, price]);

    await db.query('COMMIT');
    res.json({ success: true, message: 'Compra realizada!' });

  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ message: 'Erro na compra' });
  }
};