const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const authRepository = require('../modules/auth/auth.repository');
const { HttpError } = require('../utils/http-error');

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

async function authenticateAdmin(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw new HttpError(401, 'Token de autenticacao ausente.');
    }

    const payload = jwt.verify(token, env.jwtSecret);

    if (payload.type !== 'admin' || !payload.admin_id) {
      throw new HttpError(401, 'Token de administrador invalido.');
    }

    const admin = await authRepository.findAdministradorById(payload.admin_id);

    if (!admin) {
      throw new HttpError(401, 'Administrador nao encontrado.');
    }

    req.admin = {
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      whatsapp: admin.whatsapp,
      pix_chave: admin.pixChave,
      pix_tipo: admin.pixTipo,
      telefone_mensagens: admin.telefoneMensagens,
    };
    req.admin_id = admin.id;

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Token de autenticacao invalido ou expirado.'));
    }

    return next(error);
  }
}

module.exports = {
  authenticateAdmin,
};
