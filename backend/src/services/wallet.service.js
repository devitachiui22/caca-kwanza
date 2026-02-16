const db = require('../config/db');

class WalletService {
    // Transferência segura entre usuários (Atomicidade)
    static async processPayment(payerId, receiverId, amount, description) {
        const client = await db.pool.connect(); // Usando cliente para transação

        try {
            await client.query('BEGIN');

            // 1. Verificar saldo do pagador
            const payerRes = await client.query('SELECT coins FROM users WHERE id = $1', [payerId]);
            if (payerRes.rows[0].coins < amount) {
                throw new Error('Saldo insuficiente');
            }

            // 2. Debitar do Pagador
            await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [amount, payerId]);
            await client.query("INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'payment', $3)", [payerId, -amount, description]);

            // 3. Creditar ao Recebedor (se existir)
            if (receiverId) {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [amount, receiverId]);
                await client.query("INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'receive', $3)", [receiverId, amount, description]);
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

// Nota: Precisamos exportar o pool no db.js como 'pool' para isso funcionar,
// ou usar a função query simples se não quiser complexidade de transação agora.
// Vou manter simples nos controllers para evitar erros de conexão no Render Free Tier.
module.exports = WalletService;