const net = require('net');
const { spawn } = require('child_process');

const MAX_ATTEMPTS = Number(process.env.DB_WAIT_ATTEMPTS || 60);
const WAIT_INTERVAL_MS = Number(process.env.DB_WAIT_INTERVAL_MS || 2000);

function normalizeEnvUrl(value) {
  if (!value) {
    return '';
  }

  let normalized = value.trim();

  if (normalized.includes('=') && !normalized.startsWith('postgres')) {
    normalized = normalized.slice(normalized.indexOf('=') + 1).trim();
  }

  return normalized.replace(/^['"]|['"]$/g, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDatabaseUrl() {
  const databaseUrl = normalizeEnvUrl(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  let url;

  try {
    url = new URL(databaseUrl);
  } catch (error) {
    throw new Error('DATABASE_URL invalida. Use somente a URL PostgreSQL, sem o prefixo DATABASE_URL= e sem aspas.');
  }

  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL invalida. O protocolo precisa ser postgresql:// ou postgres://.');
  }

  process.env.DATABASE_URL = databaseUrl;

  return {
    host: url.hostname,
    port: Number(url.port || 5432),
  };
}

function canConnect({ host, port }) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(3000);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForDatabase() {
  const target = parseDatabaseUrl();

  console.log(`[entrypoint] Aguardando banco em ${target.host}:${target.port}...`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (await canConnect(target)) {
      console.log('[entrypoint] Banco de dados pronto.');
      return;
    }

    console.log(`[entrypoint] Banco indisponivel. Tentativa ${attempt}/${MAX_ATTEMPTS}.`);
    await sleep(WAIT_INTERVAL_MS);
  }

  throw new Error('Banco de dados nao ficou pronto dentro do tempo limite.');
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Comando falhou (${code}): ${command} ${args.join(' ')}`));
    });

    child.once('error', reject);
  });
}

async function runSeedIfConfigured() {
  const packageJson = require('../package.json');

  if (packageJson.scripts?.['db:seed']) {
    console.log('[entrypoint] Executando seed inicial...');
    await run('npm', ['run', 'db:seed']);
    return;
  }

  console.log('[entrypoint] Nenhum seed configurado. Pulando etapa.');
}

async function startServer() {
  console.log('[entrypoint] Iniciando API em modo de producao...');
  await run('node', ['server.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });
}

async function main() {
  await waitForDatabase();
  console.log('[entrypoint] Aplicando migrations Prisma...');
  await run('npx', ['prisma', 'migrate', 'deploy']);
  await runSeedIfConfigured();
  await startServer();
}

main().catch((error) => {
  console.error(`[entrypoint] ${error.message}`);
  process.exit(1);
});
