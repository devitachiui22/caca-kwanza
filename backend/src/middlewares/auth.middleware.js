const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Obter o header Authorization
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token de autenticação ausente.'
    });
  }

  // 2. Extrair o token (Bearer Token)
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
      return res.status(401).json({
          success: false,
          message: 'Token mal formatado.'
      });
  }

  try {
    // 3. Verificar validade e expiração
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Anexar usuário à requisição
    req.user = verified;
    next();

  } catch (err) {
    return res.status(403).json({
        success: false,
        message: 'Token inválido ou expirado. Faça login novamente.'
    });
  }
};