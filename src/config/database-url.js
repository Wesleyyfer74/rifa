function cleanUrlValue(value) {
  if (!value || value.trim() === '') {
    return '';
  }

  let normalized = value.trim();

  if (normalized.includes('=') && !normalized.startsWith('postgres')) {
    normalized = normalized.slice(normalized.indexOf('=') + 1).trim();
  }

  return normalized.replace(/^['"]|['"]$/g, '');
}

function isValidPostgresUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return ['postgresql:', 'postgres:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

function buildUrlFromPgEnv(env = process.env) {
  const host = env.PGHOST || env.POSTGRES_HOST;
  const port = env.PGPORT || env.POSTGRES_PORT || 5432;
  const user = env.PGUSER || env.POSTGRES_USER;
  const password = env.PGPASSWORD || env.POSTGRES_PASSWORD;
  const database = env.PGDATABASE || env.POSTGRES_DB || env.POSTGRES_DATABASE;

  if (!host || !user || !password || !database) {
    return '';
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function resolveDatabaseUrl(env = process.env) {
  const candidates = [
    cleanUrlValue(env.DATABASE_URL),
    cleanUrlValue(env.DATABASE_PUBLIC_URL),
    buildUrlFromPgEnv(env),
  ].filter(Boolean);

  const databaseUrl = candidates.find(isValidPostgresUrl);

  if (!databaseUrl) {
    return '';
  }

  env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

module.exports = {
  cleanUrlValue,
  resolveDatabaseUrl,
  isValidPostgresUrl,
};
