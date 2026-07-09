# Rifa Headless - API + Painel

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

Com essa opcao ativa, o endpoint publico `POST /api/v1/pedidos/reservar` gera o PIX automaticamente apos reservar as cotas. A landing page recebe `pix_qr_code` e `pix_copia_cola`, e o Mercado Pago confirma o pagamento chamando:

```text
https://rifa-production-eef0.up.railway.app/api/v1/webhooks/pagamento
```

Cadastre essa URL no painel do Mercado Pago em Webhooks/Notificacoes de pagamento. Em ambiente diferente, troque o dominio e mantenha o caminho `/api/v1/webhooks/pagamento`.

O dono da rifa deve acessar `Painel > Perfil > Gateway de pagamento` e clicar em **Conectar Mercado Pago**. Ele autoriza sua aplicacao sem informar senha. Depois disso, os PIX daquela conta sao criados no Mercado Pago dele.

Tambem e possivel usar **Asaas com subcontas e split**. Nesse modelo, a sua conta/CNPJ Asaas cria uma subconta para cada dono de rifa via API. O Asaas retorna `apiKey` e `walletId`; o sistema salva esses dados com seguranca e usa o `walletId` no split para repassar automaticamente a parte do dono em cada venda.

### `MERCADO_PAGO_CLIENT_ID`

Obrigatorio para o botao **Conectar Mercado Pago**. Identificador da sua aplicacao criada no painel de desenvolvedor do Mercado Pago.

```env
MERCADO_PAGO_CLIENT_ID="seu-client-id"
```

### `MERCADO_PAGO_CLIENT_SECRET`

Obrigatorio para trocar o codigo de autorizacao pelo token da conta do dono da rifa.

```env
MERCADO_PAGO_CLIENT_SECRET="seu-client-secret"
```

### `MERCADO_PAGO_REDIRECT_URI`

Opcional se `PUBLIC_APP_URL` estiver correto. Precisa ser a mesma URL cadastrada na aplicacao Mercado Pago.

```env
MERCADO_PAGO_REDIRECT_URI="https://rifa-production-eef0.up.railway.app/api/v1/admin/gateways/mercado-pago/callback"
```

### `MERCADO_PAGO_ACCESS_TOKEN`

Opcional. Token global de fallback para testes ou conta central. Para o modelo correto de criadores conectados, prefira `MERCADO_PAGO_CLIENT_ID` e `MERCADO_PAGO_CLIENT_SECRET`.

```env
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
```

### `MERCADO_PAGO_WEBHOOK_SECRET`

Obrigatorio somente quando `PAYMENT_PROVIDER=mercado_pago`.
Chave secreta configurada no painel de webhooks do Mercado Pago para validar `x-signature`.

```env
MERCADO_PAGO_WEBHOOK_SECRET="sua-chave-secreta-do-webhook"
```

### `ASAAS_WEBHOOK_TOKEN`

Opcional, mas recomendado. Token que voce configura no webhook do Asaas para validar as notificacoes recebidas.

```env
ASAAS_WEBHOOK_TOKEN="seu-token-webhook-asaas"
```

### `ASAAS_PLATFORM_API_KEY`

Obrigatorio para criar subcontas Asaas e emitir as cobrancas pela sua conta/CNPJ principal.

```env
ASAAS_PLATFORM_API_KEY="$aact_YOUR_KEY"
```

### `ASAAS_PLATFORM_ENVIRONMENT`

Ambiente da sua conta Asaas principal.

```env
ASAAS_PLATFORM_ENVIRONMENT="production"
```

### `ASAAS_DEFAULT_SPLIT_PERCENTUAL`

Percentual liquido padrao repassado ao dono da rifa pela subconta Asaas criada no painel. A diferenca fica automaticamente na conta principal que emitiu a cobranca.

```env
ASAAS_DEFAULT_SPLIT_PERCENTUAL="90"
```

Com subcontas ativas, o painel tambem permite:

- consultar saldo da subconta Asaas do dono da rifa;
- solicitar saque via Pix para a chave Pix cadastrada no perfil;
- registrar cada saque na tabela `saques`.

Rotas protegidas:

```text
GET /api/v1/admin/gateways/asaas/saldo
POST /api/v1/admin/gateways/asaas/saques
```

Webhook Asaas:

```text
https://rifa-production-eef0.up.railway.app/api/v1/webhooks/pagamento
```

### `PAYMENT_WEBHOOK_ALLOWED_IPS`

Opcional. Lista de IPs autorizados para chamar o webhook, separados por virgula. Se vazio, a seguranca fica baseada na assinatura do gateway.

```env
PAYMENT_WEBHOOK_ALLOWED_IPS=""
```

### `WHATSAPP_API_URL`

Opcional. Endpoint da instancia WhatsApp (Evolution API, Z-API ou similar) para disparos de remarketing.
Se vazio, o sistema enfileira e simula os envios no log, sem chamar API externa.

```env
WHATSAPP_API_URL="https://sua-instancia-whatsapp.com/message/sendText"
```

### `WHATSAPP_API_TOKEN`

Opcional. Token privado da instancia WhatsApp usado junto com `WHATSAPP_API_URL`.

```env
WHATSAPP_API_TOKEN="seu-token-da-instancia"
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
docker build -t rifa-headless .
```

Run local:

```bash
docker run --rm -p 3000:3000 --env-file .env rifa-headless
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
- `GET /api/v1/admin/historico`
- `POST /api/v1/admin/usuarios-clientes`
- `GET /api/v1/admin/campanhas`
- `POST /api/v1/admin/campanhas`
- `GET /api/v1/admin/campanhas/:id/verificar-disparo`
- `POST /api/v1/admin/campanhas/:id/disparar-whatsapp`
- `GET /api/v1/admin/campanhas/:id/compradores-stats`
- `PATCH /api/v1/admin/campanhas/:id/finalizar`
- `PUT /api/v1/admin/campanhas/:id`
- `DELETE /api/v1/admin/campanhas/:id`
- `GET /api/v1/admin/rifinhas`
- `POST /api/v1/admin/rifinhas`
- `DELETE /api/v1/admin/rifinhas/:id`
- `GET /api/v1/admin/pedidos`

Veja exemplos em [docs/API.md](docs/API.md).
