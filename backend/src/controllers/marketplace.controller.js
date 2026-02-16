const db = require('../config/db');

/**
 * [POST] /api/marketplace/products/buy
 * Compra de produto da loja oficial (Vouchers, Merch)
 */
exports.buySystemProduct = async (req, res, next) => {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) return res.status(400).json({ success: false, message: "ID do produto inválido." });

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Validar Produto e Estoque (Lock Row)
        const productRes = await client.query(
            'SELECT * FROM products WHERE id = $1 AND active = true FOR UPDATE',
            [productId]
        );

        if (productRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Produto não encontrado." });
        }
        const product = productRes.rows[0];

        if (product.stock <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "Produto esgotado." });
        }

        // 2. Validar Saldo do Usuário (Lock Row)
        const userRes = await client.query(
            'SELECT coins, email FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );
        const user = userRes.rows[0];

        if (user.coins < product.price) {
            await client.query('ROLLBACK');
            return res.status(402).json({ success: false, message: `Saldo insuficiente. Necessário: ${product.price}` });
        }

        // 3. Executar Débito e Baixa de Estoque
        await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [product.price, userId]);
        await client.query('UPDATE products SET stock = stock - 1 WHERE id = $1', [productId]);

        // 4. Gerar Pedido
        const orderRes = await client.query(
            `INSERT INTO orders (user_id, product_id, amount_paid, status, delivery_code)
             VALUES ($1, $2, $3, 'completed', substring(md5(random()::text), 1, 10))
             RETURNING id, order_number, delivery_code`,
            [userId, productId, product.price]
        );

        // 5. Registrar Transação no Extrato
        await client.query(
            `INSERT INTO transactions (user_id, amount, type, description)
             VALUES ($1, $2, 'store_purchase', $3)`,
            [userId, -product.price, `Compra Loja: ${product.name}`]
        );

        await client.query('COMMIT');

        console.log(`✅ [MARKET] Venda realizada: ${product.name} p/ User ${userId}`);

        res.status(200).json({
            success: true,
            message: "Compra realizada com sucesso!",
            order: orderRes.rows[0],
            newBalance: user.coins - product.price
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ [BUY ERROR]:", error);
        next(error);
    } finally {
        client.release();
    }
};

/**
 * [POST] /api/marketplace/listings/buy
 * Compra P2P (Jogador para Jogador)
 */
exports.buyP2PItem = async (req, res, next) => {
    const { itemId } = req.body;
    const buyerId = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscar Item e Vendedor
        const itemRes = await client.query(
            `SELECT i.*, u.name as owner_name
             FROM items i
             JOIN users u ON i.owner_id = u.id
             WHERE i.id = $1 AND i.is_listed_for_sale = true
             FOR UPDATE`,
            [itemId]
        );

        if (itemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Item não disponível para venda." });
        }
        const item = itemRes.rows[0];
        const sellerId = item.owner_id;
        const price = item.listing_price;

        // Regra de Negócio: Não pode comprar o próprio item
        if (buyerId === sellerId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "Você não pode comprar seu próprio item." });
        }

        // 2. Verificar Saldo Comprador
        const buyerRes = await client.query('SELECT coins FROM users WHERE id = $1 FOR UPDATE', [buyerId]);
        const buyer = buyerRes.rows[0];

        if (buyer.coins < price) {
            await client.query('ROLLBACK');
            return res.status(402).json({ success: false, message: "Saldo insuficiente." });
        }

        // 3. TRANSFERÊNCIA (Atomic)
        // Debita comprador
        await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, buyerId]);
        // Credita vendedor (Comissão de 5% para o sistema opcional - aqui está 0%)
        await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [price, sellerId]);

        // Transfere Propriedade do Item e Remove da Lista
        await client.query(
            'UPDATE items SET owner_id = $1, is_listed_for_sale = false, listing_price = 0 WHERE id = $2',
            [buyerId, itemId]
        );

        // 4. Logs de Transação para ambos
        const descBuy = `P2P Compra: ${item.name} de ${item.owner_name}`;
        const descSell = `P2P Venda: ${item.name} (Taxa 0%)`;

        await client.query("INSERT INTO transactions (user_id, amount, type, description, related_item_id) VALUES ($1, $2, 'market_buy', $3, $4)", [buyerId, -price, descBuy, itemId]);
        await client.query("INSERT INTO transactions (user_id, amount, type, description, related_item_id) VALUES ($1, $2, 'market_sell', $3, $4)", [sellerId, price, descSell, itemId]);

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: "Item comprado com sucesso!",
            item: { name: item.name, newOwnerId: buyerId },
            cost: price
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ [P2P ERROR]:", error);
        next(error);
    } finally {
        client.release();
    }
};