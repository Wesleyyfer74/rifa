# Rifa Do Cipriano - Headless API

Sistema API-first para gestao de campanhas de rifa, rifinhas e pedidos.

## Stack

- Node.js
- Express
- PostgreSQL
- Prisma ORM

## Setup local

```bash
npm install
copy .env.example .env
npm run db:generate
npm run db:migrate:dev
npm start
```

Configure `DATABASE_URL` no `.env` apontando para um PostgreSQL.

## Railway

1. Crie um projeto no Railway.
2. Adicione um banco PostgreSQL.
3. Configure a variavel `DATABASE_URL` com a URL gerada pelo Railway.
4. Configure o deploy pelo GitHub.
5. O comando de start ja esta pronto:

```bash
npm start
```

Para aplicar migrations em producao:

```bash
npm run db:migrate
```

## Endpoints iniciais

- `GET /health`
- `GET /api/v1/campanhas`
- `GET /api/v1/campanhas/:slug`
- `POST /api/v1/pedidos/reservar`
- `GET /api/v1/pedidos/status/:pedido_id`
- `POST /api/v1/admin/usuarios-clientes`
- `POST /api/v1/admin/campanhas`

Veja exemplos em [docs/API.md](docs/API.md).
