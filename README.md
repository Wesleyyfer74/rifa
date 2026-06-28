# Rifa Do Cipriano - Headless API + Painel

Projeto Node.js API-first para gestao de rifas, campanhas, rifinhas, pedidos e painel administrativo.

## Stack

- Node.js 20
- Express
- PostgreSQL
- Prisma ORM
- Frontend estatico para landing e painel
- Tailwind via CDN no painel

## Estrutura

```text
server.js                 # Entrada do backend
src/                      # API Express modular
prisma/                   # Schema e migrations PostgreSQL
public/                   # Landing page e painel estatico
Dockerfile                # Build para Railway/Docker
railway.json              # Start command Railway
```

## URLs locais

```text
GET /health
GET /
GET /painel
```

## Variaveis de ambiente obrigatorias

Cadastre estas variaveis no servico da aplicacao no Railway.

### `DATABASE_URL`

Conexao PostgreSQL usada pelo Prisma.

Exemplo com referencia interna Railway:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Se o servico do banco tiver outro nome, troque `Postgres` pelo nome correto.

No Railway, cadastre apenas o valor da URL. Nao coloque `DATABASE_URL=` dentro do campo de valor e evite aspas manuais.

Correto:

```env
postgresql://usuario:senha@host:5432/railway
```

Incorreto:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/railway"
```

Se estiver usando o banco Postgres dentro do mesmo projeto Railway, prefira a URL interna (`postgres.railway.internal`). Para rodar localmente fora do Railway, use a `DATABASE_PUBLIC_URL`.

Fallback aceito pelo entrypoint caso a URL esteja ausente ou mal configurada:

```env
PGHOST=postgres.railway.internal
PGPORT=5432
PGUSER=postgres
PGPASSWORD=sua-senha
PGDATABASE=railway
```

O sistema monta internamente a `DATABASE_URL` para o Prisma a partir dessas variaveis.

### `JWT_SECRET`

Chave secreta para assinatura de tokens JWT da API.

Use uma string longa e aleatoria:

```env
JWT_SECRET="gere-uma-chave-com-32-ou-mais-caracteres"
```

### `APP_KEY`

Chave geral da aplicacao para criptografia/assinaturas internas futuras.

```env
APP_KEY="gere-outra-chave-com-32-ou-mais-caracteres"
```

### `CORS_ALLOWED_ORIGINS`

Lista de origens autorizadas a consumir a API pelo navegador.

Use virgula para separar multiplas URLs:

```env
CORS_ALLOWED_ORIGINS="https://seu-painel.up.railway.app,https://landing-do-cliente.com"
```

Durante desenvolvimento local:

```env
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

### `PORT`

Fornecida automaticamente pelo Railway. O backend usa `process.env.PORT`.

```env
PORT=3000
```

### `PAYMENT_PROVIDER`

Opcional. Gateway de pagamento usado pela API. Por padrao o sistema sobe em modo manual:

```env
PAYMENT_PROVIDER="manual"
```

Para ativar PIX via Mercado Pago:

```env
PAYMENT_PROVIDER="mercado_pago"
```

### `MERCADO_PAGO_ACCESS_TOKEN`

Obrigatorio somente quando `PAYMENT_PROVIDER=mercado_pago`.
Token privado do Mercado Pago usado para criar pagamentos PIX e consultar pagamentos recebidos no webhook.

```env
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
```

### `MERCADO_PAGO_WEBHOOK_SECRET`

Obrigatorio somente quando `PAYMENT_PROVIDER=mercado_pago`.
Chave secreta configurada no painel de webhooks do Mercado Pago para validar `x-signature`.

```env
MERCADO_PAGO_WEBHOOK_SECRET="sua-chave-secreta-do-webhook"
```

### `PAYMENT_WEBHOOK_ALLOWED_IPS`

Opcional. Lista de IPs autorizados para chamar o webhook, separados por virgula. Se vazio, a seguranca fica baseada na assinatura do gateway.

```env
PAYMENT_WEBHOOK_ALLOWED_IPS=""
```

### `PUBLIC_APP_URL`

URL publica do app, usada por integrações e links.

```env
PUBLIC_APP_URL="https://seu-app.up.railway.app"
```

## Setup local

```bash
npm install
copy .env.example .env
npm run db:generate
npm run db:migrate:dev
npm start
```

## Deploy no Railway

1. Crie um projeto no Railway.
2. Adicione um banco PostgreSQL.
3. No servico da aplicacao Node, configure as variaveis listadas acima.
4. Conecte o repositorio GitHub.
5. Faça deploy.

O Railway usara [railway.json](railway.json):

```bash
npm run start:railway
```

Esse comando executa o entrypoint [scripts/start-railway.js](scripts/start-railway.js):

1. Aguarda o PostgreSQL aceitar conexao.
2. Executa `npx prisma migrate deploy`.
3. Executa `npm run db:seed` se esse script existir.
4. Inicia `node server.js` com `NODE_ENV=production`.

Assim, as migrations sao aplicadas antes do servidor iniciar.

Variaveis opcionais para controlar a espera pelo banco:

```env
DB_WAIT_ATTEMPTS=60
DB_WAIT_INTERVAL_MS=2000
```

## Docker

Build local:

```bash
docker build -t rifa-do-cipriano .
```

Run local:

```bash
docker run --rm -p 3000:3000 --env-file .env rifa-do-cipriano
```

## Endpoints iniciais

- `GET /health`
- `GET /api/v1/campanhas`
- `GET /api/v1/campanhas/:slug`
- `POST /api/v1/pedidos/reservar`
- `GET /api/v1/pedidos/status/:pedido_id`
- `POST /api/v1/webhooks/pagamento`
- `POST /api/v1/admin/register`
- `POST /api/v1/admin/login`
- `POST /api/v1/admin/usuarios-clientes`
- `GET /api/v1/admin/campanhas`
- `POST /api/v1/admin/campanhas`
- `PUT /api/v1/admin/campanhas/:id`
- `DELETE /api/v1/admin/campanhas/:id`
- `GET /api/v1/admin/rifinhas`
- `POST /api/v1/admin/rifinhas`
- `DELETE /api/v1/admin/rifinhas/:id`
- `GET /api/v1/admin/pedidos`

Veja exemplos em [docs/API.md](docs/API.md).
