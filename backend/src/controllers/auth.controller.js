const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro de Usuário
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Preencha todos os campos!' });
  }

  try {
    // 1. Verificar se usuário existe
    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Este email já está em uso.' });
    }

    // 2. Criptografar senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Inserir no banco
    const newUser = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, points, coins',
      [name, email, hashedPassword]
    );

    // 4. Gerar Token imediato
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      message: 'Bem-vindo ao CaçaKwanza!',
      token,
      user: newUser.rows[0]
    });

  } catch (err) {
    console.error('Erro no Registro:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

// Login de Usuário
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar usuário
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Email ou senha incorretos.' });
    }

    // 2. Verificar senha
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Email ou senha incorretos.' });
    }

    // 3. Gerar Token
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    // Remover senha do retorno
    delete user.rows[0].password;

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: user.rows[0]
    });

  } catch (err) {
    console.error('Erro no Login:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};