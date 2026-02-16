const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Ler o header Authorization
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'Acesso negado! Token não fornecido.' });
  }

  // 2. Validar formato "Bearer TOKEN"
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Token inválido.' });
  }

  try {
    // 3. Verificar Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Adiciona o ID do usuário na requisição
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token inválido ou expirado.' });
  }
};