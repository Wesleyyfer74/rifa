CREATE TYPE "CotaStatus" AS ENUM ('disponivel', 'reservado', 'pago');

CREATE TABLE "cotas_campanha" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campanha_id" UUID NOT NULL,
  "pedido_id" UUID,
  "numero" INTEGER NOT NULL,
  "status" "CotaStatus" NOT NULL DEFAULT 'disponivel',
  "reserved_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cotas_campanha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cotas_campanha_campanha_id_numero_key" ON "cotas_campanha"("campanha_id", "numero");
CREATE INDEX "cotas_campanha_campanha_id_status_idx" ON "cotas_campanha"("campanha_id", "status");
CREATE INDEX "cotas_campanha_pedido_id_idx" ON "cotas_campanha"("pedido_id");

ALTER TABLE "cotas_campanha"
  ADD CONSTRAINT "cotas_campanha_campanha_id_fkey"
  FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cotas_campanha"
  ADD CONSTRAINT "cotas_campanha_pedido_id_fkey"
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
