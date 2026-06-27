CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UsuarioClienteStatus" AS ENUM ('ativo', 'suspenso', 'inativo');
CREATE TYPE "CampanhaStatus" AS ENUM ('ativo', 'pausado', 'finalizado');
CREATE TYPE "RifinhaStatus" AS ENUM ('ativo', 'pausado', 'finalizado');
CREATE TYPE "StatusPagamento" AS ENUM ('pendente', 'pago', 'expirado', 'cancelado');

CREATE TABLE "usuarios_clientes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(160) NOT NULL,
  "email" VARCHAR(180) NOT NULL,
  "whatsapp" VARCHAR(30),
  "senha_hash" VARCHAR(255) NOT NULL,
  "status" "UsuarioClienteStatus" NOT NULL DEFAULT 'ativo',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usuarios_clientes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campanhas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_cliente_id" UUID NOT NULL,
  "titulo" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(180) NOT NULL,
  "descricao" TEXT,
  "regulamento" TEXT,
  "valor_cota" DECIMAL(10,2) NOT NULL,
  "total_cotas" INTEGER NOT NULL,
  "status" "CampanhaStatus" NOT NULL DEFAULT 'pausado',
  "imagem_url" TEXT,
  "data_sorteio" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rifinhas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campanha_id" UUID NOT NULL,
  "titulo" VARCHAR(180) NOT NULL,
  "descricao" TEXT,
  "valor_cota" DECIMAL(10,2) NOT NULL,
  "total_cotas" INTEGER NOT NULL,
  "status" "RifinhaStatus" NOT NULL DEFAULT 'ativo',
  "imagem_url" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rifinhas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pedidos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campanha_id" UUID NOT NULL,
  "rifinha_id" UUID,
  "comprador_nome" VARCHAR(160) NOT NULL,
  "comprador_whatsapp" VARCHAR(30) NOT NULL,
  "comprador_email" VARCHAR(180),
  "cotas_reservadas" INTEGER[] NOT NULL,
  "status_pagamento" "StatusPagamento" NOT NULL DEFAULT 'pendente',
  "valor_total" DECIMAL(10,2) NOT NULL,
  "pix_copia_cola" TEXT,
  "pix_qr_code" TEXT,
  "expires_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_clientes_email_key" ON "usuarios_clientes"("email");
CREATE UNIQUE INDEX "campanhas_slug_key" ON "campanhas"("slug");
CREATE INDEX "campanhas_usuario_cliente_id_idx" ON "campanhas"("usuario_cliente_id");
CREATE INDEX "campanhas_status_idx" ON "campanhas"("status");
CREATE INDEX "rifinhas_campanha_id_idx" ON "rifinhas"("campanha_id");
CREATE INDEX "rifinhas_status_idx" ON "rifinhas"("status");
CREATE INDEX "pedidos_campanha_id_idx" ON "pedidos"("campanha_id");
CREATE INDEX "pedidos_rifinha_id_idx" ON "pedidos"("rifinha_id");
CREATE INDEX "pedidos_status_pagamento_idx" ON "pedidos"("status_pagamento");

ALTER TABLE "campanhas"
  ADD CONSTRAINT "campanhas_usuario_cliente_id_fkey"
  FOREIGN KEY ("usuario_cliente_id") REFERENCES "usuarios_clientes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rifinhas"
  ADD CONSTRAINT "rifinhas_campanha_id_fkey"
  FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pedidos"
  ADD CONSTRAINT "pedidos_campanha_id_fkey"
  FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pedidos"
  ADD CONSTRAINT "pedidos_rifinha_id_fkey"
  FOREIGN KEY ("rifinha_id") REFERENCES "rifinhas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
