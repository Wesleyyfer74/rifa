const net = require('net');
const { spawn } = require('child_process');
const { resolveDatabaseUrl } = require('../src/config/database-url');

const MAX_ATTEMPTS = Number(process.env.DB_WAIT_ATTEMPTS || 60);
const WAIT_INTERVAL_MS = Number(process.env.DB_WAIT_INTERVAL_MS || 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDatabaseUrl() {
  const databaseUrl = resolveDatabaseUrl(process.env);

  if (!databaseUrl) {
    throw new Error('DATABASE_URL invalida. Configure uma URL PostgreSQL valida ou as variaveis PGHOST, PGPORT, PGUSER, PGPASSWORD e PGDATABASE.');
  }

  const url = new URL(databaseUrl);

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
