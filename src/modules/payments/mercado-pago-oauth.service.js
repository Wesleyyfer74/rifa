const jwt = require('jsonwebtoken');
const prisma = require('../../database/prisma');
const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');
const { decryptSecret, encryptSecret } = require('../../utils/secret-crypto');

const AUTH_URL = 'https://auth.mercadopago.com.br/authorization';
const TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
const EXPIRY_SAFETY_MS = 5 * 60 * 1000;

function isOAuthConfigured() {
  return Boolean(env.mercadoPagoClientId && env.mercadoPagoClientSecret);
}

function requireOAuthConfig() {
  if (!isOAuthConfigured()) {
    throw new HttpError(424, 'Mercado Pago ainda nao foi configurado no servidor. Configure MERCADO_PAGO_CLIENT_ID e MERCADO_PAGO_CLIENT_SECRET no Railway para liberar essa conexao.');
  }
}

function getRedirectUri() {
  if (!env.publicAppUrl) {
    throw new HttpError(424, 'PUBLIC_APP_URL nao configurada. Informe a URL publica do app para conectar Mercado Pago.');
  }

  return env.mercadoPagoRedirectUri
    || `${env.publicAppUrl.replace(/\/$/, '')}/api/v1/admin/gateways/mercado-pago/callback`;
}

function createState(adminId) {
  return jwt.sign({
    type: 'mercado_pago_oauth',
    admin_id: adminId,
  }, env.jwtSecret, { expiresIn: '15m' });
}

function readState(state) {
  try {
    const payload = jwt.verify(state, env.jwtSecret);

    if (payload.type !== 'mercado_pago_oauth' || !payload.admin_id) {
      throw new Error('Estado invalido.');
    }

    return payload;
  } catch (error) {
    throw new HttpError(401, 'Conexao Mercado Pago expirada ou invalida. Tente conectar novamente.');
  }
}

function buildAuthorizationUrl(adminId) {
  requireOAuthConfig();

  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', env.mercadoPagoClientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('platform_id', 'mp');
  url.searchParams.set('state', createState(adminId));
  url.searchParams.set('redirect_uri', getRedirectUri());

  return url.toString();
}

async function requestToken(body) {
  requireOAuthConfig();

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new HttpError(502, `Falha ao conectar Mercado Pago: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function getExpiresAt(expiresIn) {
  const seconds = Number(expiresIn || 0);
  return seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
}

async function connectFromCallback({ code, state }) {
  if (!code || !state) {
    throw new HttpError(422, 'Retorno Mercado Pago sem codigo de autorizacao.');
  }

  const payload = readState(state);
  const token = await requestToken({
    client_secret: env.mercadoPagoClientSecret,
    client_id: env.mercadoPagoClientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
  });

  const admin = await prisma.administrador.update({
    where: { id: payload.admin_id },
    data: {
      gatewayPreferido: 'mercado_pago',
      mercadoPagoUserId: token.user_id ? String(token.user_id) : null,
      mercadoPagoAccessToken: encryptSecret(token.access_token),
      mercadoPagoRefreshToken: encryptSecret(token.refresh_token),
      mercadoPagoTokenExpiresAt: getExpiresAt(token.expires_in),
      mercadoPagoConnectedAt: new Date(),
    },
  });

  return admin;
}

async function refreshAdminToken(admin) {
  if (!admin.mercadoPagoRefreshToken) {
    throw new HttpError(409, 'Mercado Pago nao conectado para este administrador.');
  }

  const token = await requestToken({
    client_secret: env.mercadoPagoClientSecret,
    client_id: env.mercadoPagoClientId,
    grant_type: 'refresh_token',
    refresh_token: decryptSecret(admin.mercadoPagoRefreshToken),
  });

  return prisma.administrador.update({
    where: { id: admin.id },
    data: {
      mercadoPagoUserId: token.user_id ? String(token.user_id) : admin.mercadoPagoUserId,
      mercadoPagoAccessToken: encryptSecret(token.access_token),
      mercadoPagoRefreshToken: encryptSecret(token.refresh_token || decryptSecret(admin.mercadoPagoRefreshToken)),
      mercadoPagoTokenExpiresAt: getExpiresAt(token.expires_in),
      mercadoPagoConnectedAt: admin.mercadoPagoConnectedAt || new Date(),
    },
  });
}

async function getAdminAccessToken(adminId) {
  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  if (!admin?.mercadoPagoAccessToken) {
    if (env.mercadoPagoAccessToken) {
      return env.mercadoPagoAccessToken;
    }

    throw new HttpError(409, 'Conecte o Mercado Pago no perfil do dono da rifa antes de vender.');
  }

  const expiresAt = admin.mercadoPagoTokenExpiresAt?.getTime?.() || 0;
  const validToken = !expiresAt || expiresAt > Date.now() + EXPIRY_SAFETY_MS
    ? admin
    : await refreshAdminToken(admin);

  return decryptSecret(validToken.mercadoPagoAccessToken);
}

function getConnectionStatus(admin) {
  return {
    conectado: Boolean(admin?.mercadoPagoAccessToken),
    configurado: isOAuthConfigured(),
    redirect_uri: isOAuthConfigured() ? getRedirectUri() : null,
    user_id: admin?.mercadoPagoUserId || null,
    conectado_em: admin?.mercadoPagoConnectedAt || null,
    expira_em: admin?.mercadoPagoTokenExpiresAt || null,
  };
}

async function disconnect(adminId) {
  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  return prisma.administrador.update({
    where: { id: adminId },
    data: {
      gatewayPreferido: admin?.asaasWalletId ? 'asaas' : null,
      mercadoPagoUserId: null,
      mercadoPagoAccessToken: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiresAt: null,
      mercadoPagoConnectedAt: null,
    },
  });
}

module.exports = {
  buildAuthorizationUrl,
  connectFromCallback,
  disconnect,
  getAdminAccessToken,
  getConnectionStatus,
  isOAuthConfigured,
};
