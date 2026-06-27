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

function validateRuntimeEnv() {
  if (process.env.NODE_ENV === 'production') {
    requireEnv('DATABASE_URL');
    requireEnv('JWT_SECRET');
    requireEnv('APP_KEY');
    requireEnv('CORS_ALLOWED_ORIGINS');
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  appKey: process.env.APP_KEY,
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
};

module.exports = {
  env,
  parseAllowedOrigins,
  validateRuntimeEnv,
};
