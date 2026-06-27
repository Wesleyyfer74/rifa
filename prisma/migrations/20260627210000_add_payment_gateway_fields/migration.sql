ALTER TABLE "pedidos"
  ADD COLUMN "gateway_provider" VARCHAR(40),
  ADD COLUMN "gateway_payment_id" VARCHAR(120),
  ADD COLUMN "gateway_payload" JSONB;

CREATE UNIQUE INDEX "pedidos_gateway_payment_id_key" ON "pedidos"("gateway_payment_id");
CREATE INDEX "pedidos_gateway_provider_idx" ON "pedidos"("gateway_provider");
