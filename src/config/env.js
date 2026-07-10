const { cleanUrlValue, resolveDatabaseUrl } = require('./database-url');

function parseAllowedOrigins(value) {
  if (!value || value.trim() === '') {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET;
  }

  if (process.env.APP_KEY && process.env.APP_KEY.trim() !== '') {
    return process.env.APP_KEY;
  }

  const railwayFallback = [
    process.env.RAILWAY_PROJECT_ID,
    process.env.RAILWAY_SERVICE_ID,
    process.env.RAILWAY_ENVIRONMENT_ID,
  ].filter(Boolean).join(':');

  if (railwayFallback) {
    return `railway:${railwayFallback}`;
  }

  return process.env.NODE_ENV === 'production' ? '' : 'dev-local-jwt-secret';
}

function validateDatabaseUrl() {
  const databaseUrl = resolveDatabaseUrl(process.env);

  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL invalida. Configure uma URL PostgreSQL valida ou as variaveis PGHOST, PGPORT, PGUSER, PGPASSWORD e PGDATABASE.');
  }

  return databaseUrl;
}

function validateRuntimeEnv() {
  if (process.env.NODE_ENV === 'production') {
    validateDatabaseUrl();

    // Gateways sao conectados por administrador no painel.
    // As credenciais especificas sao validadas apenas quando o admin tenta conectar/usar o gateway.
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  databaseUrl: cleanUrlValue(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL),
  jwtSecret: resolveJwtSecret(),
  appKey: process.env.APP_KEY,
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  paymentProvider: process.env.PAYMENT_PROVIDER || 'manual',
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  mercadoPagoClientId: process.env.MERCADO_PAGO_CLIENT_ID,
  mercadoPagoClientSecret: process.env.MERCADO_PAGO_CLIENT_SECRET,
  mercadoPagoRedirectUri: process.env.MERCADO_PAGO_REDIRECT_URI,
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
  asaasPlatformApiKey: process.env.ASAAS_PLATFORM_API_KEY || process.env.ASAAS_API_KEY,
  asaasPlatformEnvironment: process.env.ASAAS_PLATFORM_ENVIRONMENT || process.env.ASAAS_ENVIRONMENT || 'production',
  asaasDefaultSplitPercentual: process.env.ASAAS_DEFAULT_SPLIT_PERCENTUAL || '100',
  paymentWebhookAllowedIps: parseAllowedOrigins(process.env.PAYMENT_WEBHOOK_ALLOWED_IPS),
};

module.exports = {
  env,
  parseAllowedOrigins,
  validateRuntimeEnv,
};
