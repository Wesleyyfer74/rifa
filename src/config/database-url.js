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

function describeDatabaseEnv(env = process.env) {
  const databaseUrl = cleanUrlValue(env.DATABASE_URL);
  const publicDatabaseUrl = cleanUrlValue(env.DATABASE_PUBLIC_URL);
  const pgVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
  const postgresVars = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
  const presentPgVars = pgVars.filter((name) => Boolean(env[name]));
  const presentPostgresVars = postgresVars.filter((name) => Boolean(env[name]));

  if (databaseUrl && isValidPostgresUrl(databaseUrl)) {
    return 'DATABASE_URL esta presente e tem protocolo PostgreSQL valido.';
  }

  if (publicDatabaseUrl && isValidPostgresUrl(publicDatabaseUrl)) {
    return 'DATABASE_PUBLIC_URL esta presente e tem protocolo PostgreSQL valido.';
  }

  if (databaseUrl && databaseUrl.includes('{{')) {
    return 'DATABASE_URL parece uma referencia Railway nao resolvida. Use o botao Reference/Shared Variable para apontar para Postgres.DATABASE_URL.';
  }

  if (databaseUrl && /^https?:\/\//i.test(databaseUrl)) {
    return 'DATABASE_URL parece ser uma URL de site/app. Ela precisa ser a URL do banco PostgreSQL.';
  }

  if (databaseUrl && !databaseUrl.includes('://')) {
    return 'DATABASE_URL nao tem protocolo. Ela precisa comecar com postgresql:// ou postgres://.';
  }

  if (presentPgVars.length > 0 || presentPostgresVars.length > 0) {
    return `Variaveis de banco encontradas: ${presentPgVars.concat(presentPostgresVars).join(', ')}. Ainda faltam dados para montar a conexao completa.`;
  }

  return 'Nenhuma URL PostgreSQL valida foi encontrada no servico da aplicacao.';
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
  describeDatabaseEnv,
  resolveDatabaseUrl,
  isValidPostgresUrl,
};
