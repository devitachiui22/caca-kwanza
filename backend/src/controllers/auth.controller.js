const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Validação Simples de Email (Regex)
 */
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * REGISTRO DE USUÁRIO
 * Cria conta, hash de senha e inicializa gamification
 */
exports.register = async (req, res, next) => {
    const { name, email, password } = req.body;

    // 1. Validação de Input
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Formato de email inválido.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        // 2. Verificar duplicidade
        const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (checkUser.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Este email já está cadastrado.' });
        }

        // 3. Criptografia (Bcrypt)
        const salt = await bcrypt.genSalt(12); // Salt factor 12 para maior segurança
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Inserção no Banco
        const newUserQuery = `
            INSERT INTO users (name, email, password, points, coins, level)
            VALUES ($1, $2, $3, 0, 0, 1)
            RETURNING id, name, email, points, coins, level, created_at
        `;

        const result = await db.query(newUserQuery, [name.trim(), email.toLowerCase().trim(), hashedPassword]);
        const user = result.rows[0];

        // 5. Gerar JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        console.log(`✅ [AUTH] Novo usuário registrado: ${user.email} (ID: ${user.id})`);

        res.status(201).json({
            success: true,
            message: 'Conta criada com sucesso!',
            token,
            user: user
        });

    } catch (error) {
        console.error('❌ [AUTH ERROR]:', error);
        next(error); // Passa para o error handler global
    }
};

/**
 * LOGIN DE USUÁRIO
 */
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
    }

    try {
        // 1. Buscar usuário (Incluindo a senha hash)
        const query = 'SELECT * FROM users WHERE email = $1 LIMIT 1';
        const result = await db.query(query, [email.toLowerCase().trim()]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }

        const user = result.rows[0];

        // 2. Verificar Senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }

        // 3. Atualizar último login
        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        // 4. Gerar Token
        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remover dados sensíveis antes de enviar
        delete user.password;
        delete user.uuid;

        res.status(200).json({
            success: true,
            message: 'Bem-vindo de volta!',
            token,
            user
        });

    } catch (error) {
        console.error('❌ [LOGIN ERROR]:', error);
        next(error);
    }
};