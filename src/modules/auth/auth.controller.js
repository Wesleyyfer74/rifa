const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    whatsapp: admin.whatsapp,
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

async function register(req, res, next) {
  try {
    const { nome, email, password, senha, whatsapp } = req.body;
    const plainPassword = password || senha;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!nome || !normalizedEmail || !plainPassword) {
      throw new HttpError(422, 'nome, email e password sao obrigatorios.');
    }

    if (plainPassword.length < 8) {
      throw new HttpError(422, 'A senha precisa ter pelo menos 8 caracteres.');
    }

    const existingAdmin = await authRepository.findAdministradorByEmail(normalizedEmail);

    if (existingAdmin) {
      throw new HttpError(409, 'Ja existe um administrador com este email.');
    }

    const passwordHash = await bcrypt.hash(plainPassword, 12);
    const admin = await authRepository.createAdministrador({
      nome,
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
    const { email, password, senha } = req.body;
    const plainPassword = password || senha;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !plainPassword) {
      throw new HttpError(422, 'email e password sao obrigatorios.');
    }

    const admin = await authRepository.findAdministradorByEmail(normalizedEmail);

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
