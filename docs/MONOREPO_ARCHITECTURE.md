# Arquitetura alvo do monorepo

O projeto pode continuar em um unico repositorio, com dois servicos principais:

- `backend-api`: API headless, regras de negocio, pagamentos, banco e webhooks.
- `frontend-painel`: painel administrativo consumindo a API.

## Arvore de diretorios proposta

```text
rifasite/
├─ backend-api/
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ server.js
│  │  ├─ routes/
│  │  │  └─ index.js
│  │  ├─ middlewares/
│  │  │  ├─ auth.middleware.js
│  │  │  └─ cors.middleware.js
│  │  ├─ modules/
│  │  │  ├─ auth/
│  │  │  │  ├─ auth.controller.js
│  │  │  │  ├─ auth.service.js
│  │  │  │  └─ auth.validators.js
│  │  │  ├─ campanhas/
│  │  │  │  ├─ campanhas.controller.js
│  │  │  │  ├─ campanhas.service.js
│  │  │  │  ├─ campanhas.repository.js
│  │  │  │  └─ campanhas.validators.js
│  │  │  ├─ rifinhas/
│  │  │  │  ├─ rifinhas.controller.js
│  │  │  │  ├─ rifinhas.service.js
│  │  │  │  └─ rifinhas.repository.js
│  │  │  ├─ pedidos/
│  │  │  │  ├─ pedidos.controller.js
│  │  │  │  ├─ pedidos.service.js
│  │  │  │  └─ pedidos.repository.js
│  │  │  └─ pagamentos/
│  │  │     ├─ webhooks.controller.js
│  │  │     ├─ payments.service.js
│  │  │     └─ mercado-pago.provider.js
│  │  ├─ database/
│  │  │  └─ prisma.js
│  │  ├─ config/
│  │  │  └─ env.js
│  │  └─ utils/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  ├─ scripts/
│  │  └─ start-railway.js
│  ├─ Dockerfile
│  ├─ package.json
│  └─ README.md
│
├─ frontend-painel/
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ App.jsx
│  │  │  └─ routes.jsx
│  │  ├─ components/
│  │  │  ├─ layout/
│  │  │  │  ├─ BaseLayout.jsx
│  │  │  │  └─ TopNavbar.jsx
│  │  │  └─ ui/
│  │  ├─ features/
│  │  │  ├─ campanhas/
│  │  │  ├─ rifinhas/
│  │  │  ├─ pedidos/
│  │  │  ├─ clientes/
│  │  │  └─ customizacao/
│  │  ├─ services/
│  │  │  └─ api-client.js
│  │  └─ lib/
│  ├─ public/
│  ├─ package.json
│  ├─ tailwind.config.js
│  └─ README.md
│
├─ docs/
│  ├─ API.md
│  └─ MONOREPO_ARCHITECTURE.md
├─ railway.json
└─ README.md
```

## Fluxo de rotas

Arquivo de referencia criado em:

```text
backend-api/src/routes/index.js
```

### Administrativas protegidas

Base path:

```text
/admin
```

Rotas publicas do admin:

```text
POST /admin/login
POST /admin/register
```

Rotas protegidas por `requireAuth`:

```text
GET    /admin/campanhas
POST   /admin/campanhas
GET    /admin/campanhas/:id
PUT    /admin/campanhas/:id
DELETE /admin/campanhas/:id

GET    /admin/rifinhas
POST   /admin/rifinhas
DELETE /admin/rifinhas/:id

GET    /admin/pedidos
```

### Publicas API Headless

Base path:

```text
/api/v1
```

Rotas abertas para landing pages externas:

```text
GET  /api/v1/campanha/:slug
POST /api/v1/pedido/criar
GET  /api/v1/pedido/:id
```

### Webhooks

```text
POST /api/v1/webhooks/pagamento
```

Webhooks sao publicos por rede, mas devem validar assinatura/token do gateway.

## Middlewares

- `publicCors`: aplicado nas rotas publicas da API.
- `adminCors`: aplicado nas rotas administrativas.
- `requireAuth`: aplicado apos `/admin/login` e `/admin/register`.

## Observacao

A implementacao funcional atual ainda vive em `src/`, `prisma/`, `public/` e `server.js` na raiz para preservar o deploy ja configurado no Railway. A pasta `backend-api/` e `frontend-painel/` documenta a estrutura alvo para evoluir o repositorio sem quebrar producao.
