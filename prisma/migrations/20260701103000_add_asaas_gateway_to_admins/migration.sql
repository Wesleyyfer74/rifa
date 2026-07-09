ALTER TABLE "administradores"
  ADD COLUMN "gateway_preferido" VARCHAR(30),
  ADD COLUMN "asaas_api_key" TEXT,
  ADD COLUMN "asaas_environment" VARCHAR(20),
  ADD COLUMN "asaas_connected_at" TIMESTAMP(3);
