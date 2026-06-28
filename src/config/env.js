function parseAllowedOrigins(value) {
  if (!value || value.trim() === '') {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizeEnvUrl(value) {
  if (!value || value.trim() === '') {
    return value;
  }

  let normalized = value.trim();

  if (normalized.includes('=') && !normalized.startsWith('postgres')) {
    normalized = normalized.slice(normalized.indexOf('=') + 1).trim();
  }

  return normalized.replace(/^['"]|['"]$/g, '');
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function validateDatabaseUrl() {
  const databaseUrl = normalizeEnvUrl(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('Variavel de ambiente obrigatoria ausente: DATABASE_URL');
  }

  try {
    const url = new URL(databaseUrl);

    if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
      throw new Error('invalid-protocol');
    }
  } catch (error) {
    throw new Error('DATABASE_URL invalida. Use somente a URL PostgreSQL, sem o prefixo DATABASE_URL= e sem aspas.');
  }

  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

function validateRuntimeEnv() {
  if (process.env.NODE_ENV === 'production') {
    validateDatabaseUrl();
    requireEnv('JWT_SECRET');
    requireEnv('APP_KEY');
    requireEnv('CORS_ALLOWED_ORIGINS');

    if ((process.env.PAYMENT_PROVIDER || 'mercado_pago') === 'mercado_pago') {
      requireEnv('MERCADO_PAGO_ACCESS_TOKEN');
      requireEnv('MERCADO_PAGO_WEBHOOK_SECRET');
    }
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  databaseUrl: normalizeEnvUrl(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL),
  jwtSecret: process.env.JWT_SECRET,
  appKey: process.env.APP_KEY,
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mercado_pago',
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  paymentWebhookAllowedIps: parseAllowedOrigins(process.env.PAYMENT_WEBHOOK_ALLOWED_IPS),
};

module.exports = {
  env,
  parseAllowedOrigins,
  normalizeEnvUrl,
  validateRuntimeEnv,
};
