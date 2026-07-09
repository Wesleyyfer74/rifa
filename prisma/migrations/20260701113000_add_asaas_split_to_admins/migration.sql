ALTER TABLE "administradores"
  ADD COLUMN IF NOT EXISTS "asaas_wallet_id" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "asaas_split_percentual" DECIMAL(5, 2);
