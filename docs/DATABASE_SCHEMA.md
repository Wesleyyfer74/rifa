# Banco de dados - Sistema Headless de Rifas

Stack escolhida: PostgreSQL + Prisma ORM.

O schema funcional vive em:

```text
prisma/schema.prisma
```

As migrations vivem em:

```text
prisma/migrations/
```

## Models Prisma principais

```prisma
model Campanha {
  id               String         @id @default(uuid()) @db.Uuid
  usuarioClienteId String         @map("usuario_id") @db.Uuid
  titulo           String         @db.VarChar(180)
  slug             String         @unique @db.VarChar(180)
  valorCota        Decimal        @map("valor_cota") @db.Decimal(10, 2)
  totalCotas       Int            @map("total_cotas")
  status           CampanhaStatus @default(pausado)
  imagemUrl        String?        @map("imagem_url") @db.Text

  usuarioCliente UsuarioCliente @relation(fields: [usuarioClienteId], references: [id], onDelete: Cascade)
  rifinhas       Rifinha[]
  pedidos        Pedido[]

  @@map("campanhas")
}

model Rifinha {
  id         String        @id @default(uuid()) @db.Uuid
  campanhaId String        @map("campanha_id") @db.Uuid
  titulo     String        @db.VarChar(180)
  totalCotas Int           @map("total_cotas")
  status     RifinhaStatus @default(ativo)

  campanha Campanha @relation(fields: [campanhaId], references: [id], onDelete: Cascade)

  @@map("rifinhas")
}

model Pedido {
  id                String          @id @default(uuid()) @db.Uuid
  campanhaId        String          @map("campanha_id") @db.Uuid
  compradorNome     String          @map("nome_comprador") @db.VarChar(160)
  compradorWhatsapp String          @map("whatsapp_comprador") @db.VarChar(30)
  cotasReservadas   Int[]           @map("cotas")
  statusPagamento   StatusPagamento @default(pendente) @map("status_pagamento")
  valorTotal        Decimal         @map("valor_total") @db.Decimal(10, 2)

  campanha Campanha @relation(fields: [campanhaId], references: [id], onDelete: Restrict)

  @@map("pedidos")
}
```

## SQL equivalente das tabelas solicitadas

```sql
CREATE TYPE "CampanhaStatus" AS ENUM ('ativo', 'pausado', 'finalizado');
CREATE TYPE "RifinhaStatus" AS ENUM ('ativo', 'pausado', 'finalizado');
CREATE TYPE "StatusPagamento" AS ENUM ('pendente', 'pago', 'expirado', 'cancelado');

CREATE TABLE "campanhas" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" UUID NOT NULL REFERENCES "usuarios_clientes"("id") ON DELETE CASCADE,
  "titulo" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(180) NOT NULL UNIQUE,
  "valor_cota" DECIMAL(10,2) NOT NULL,
  "total_cotas" INTEGER NOT NULL,
  "status" "CampanhaStatus" NOT NULL DEFAULT 'pausado',
  "imagem_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "rifinhas" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campanha_id" UUID NOT NULL REFERENCES "campanhas"("id") ON DELETE CASCADE,
  "titulo" VARCHAR(180) NOT NULL,
  "total_cotas" INTEGER NOT NULL,
  "status" "RifinhaStatus" NOT NULL DEFAULT 'ativo',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "pedidos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campanha_id" UUID NOT NULL REFERENCES "campanhas"("id") ON DELETE RESTRICT,
  "nome_comprador" VARCHAR(160) NOT NULL,
  "whatsapp_comprador" VARCHAR(30) NOT NULL,
  "cotas" INTEGER[] NOT NULL,
  "status_pagamento" "StatusPagamento" NOT NULL DEFAULT 'pendente',
  "valor_total" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Relacionamentos

- Uma `Campanha` pertence a um `UsuarioCliente`.
- Uma `Campanha` tem muitas `Rifinha`.
- Uma `Campanha` tem muitos `Pedido`.
- Uma `Rifinha` pertence a uma `Campanha`.
- Um `Pedido` pertence a uma `Campanha`.

## Observacao

O schema real possui campos adicionais para o produto completo:

- `descricao`
- `regulamento`
- `data_sorteio`
- `metadata`
- campos PIX/gateway em `pedidos`
- tabela `cotas_campanha` para concorrencia e bloqueio seguro de numeros

Esses campos extras nao entram em conflito com as telas do Rifei; eles suportam o fluxo headless, PIX e auditoria.
