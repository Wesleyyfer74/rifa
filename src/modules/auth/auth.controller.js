const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const asaasService = require('../payments/asaas.service');
const mercadoPagoOAuth = require('../payments/mercado-pago-oauth.service');
const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    whatsapp: admin.whatsapp,
    pix_chave: admin.pixChave,
    pix_tipo: admin.pixTipo,
    telefone_mensagens: admin.telefoneMensagens,
    gateway_preferido: admin.gatewayPreferido,
    mercado_pago: mercadoPagoOAuth.getConnectionStatus(admin),
    asaas: asaasService.getConnectionStatus(admin),
  };
}

function signToken(admin) {
  if (!env.jwtSecret) {
    throw new HttpError(500, 'JWT_SECRET nao configurado.');
  }

  return jwt.sign(
    {
      sub: admin.id,
      admin_id: admin.id,
      email: admin.email,
      type: 'admin',
    },
    env.jwtSecret,
    { expiresIn: TOKEN_EXPIRES_IN },
  );
}

function buildDefaultName(email) {
  const prefix = String(email || '').split('@')[0] || 'Dono da rifa';
  return prefix
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Dono da rifa';
}

async function register(req, res, next) {
  try {
    const { nome, email, password, senha, whatsapp } = req.body;
    const plainPassword = password || senha;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const adminName = String(nome || '').trim() || buildDefaultName(normalizedEmail);

    if (!normalizedEmail || !plainPassword) {
      throw new HttpError(422, 'email e password sao obrigatorios.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new HttpError(422, 'Email invalido.');
    }

    if (plainPassword.length < 6) {
      throw new HttpError(422, 'A senha precisa ter pelo menos 6 caracteres.');
    }

    const existingAdmin = await authRepository.findAdministradorByEmail(normalizedEmail);

    if (existingAdmin) {
      throw new HttpError(409, 'Ja existe um administrador com este email.');
    }

    const passwordHash = await bcrypt.hash(plainPassword, 12);
    const admin = await authRepository.createAdministrador({
      nome: adminName,
      email: normalizedEmail,
      password: passwordHash,
      whatsapp,
    });

    await authRepository.findOrCreateOwnerMirror(admin);

    return res.status(201).json({
      data: {
        admin: sanitizeAdmin(admin),
        token: signToken(admin),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, login: loginName, password, senha } = req.body;
    const plainPassword = password || senha;
    const loginIdentifier = String(loginName || email || '').trim();

    if (!loginIdentifier || !plainPassword) {
      throw new HttpError(422, 'login e password sao obrigatorios.');
    }

    const admin = await authRepository.findAdministradorByLogin(loginIdentifier);

    if (!admin) {
      throw new HttpError(401, 'Credenciais invalidas.');
    }

    const isValidPassword = await bcrypt.compare(plainPassword, admin.password);

    if (!isValidPassword) {
      throw new HttpError(401, 'Credenciais invalidas.');
    }

    return res.json({
      data: {
        admin: sanitizeAdmin(admin),
        token: signToken(admin),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register,
  signToken,
};
