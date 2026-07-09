ALTER TABLE "administradores"
  ADD COLUMN "mercado_pago_user_id" VARCHAR(80),
  ADD COLUMN "mercado_pago_access_token" TEXT,
  ADD COLUMN "mercado_pago_refresh_token" TEXT,
  ADD COLUMN "mercado_pago_token_expires_at" TIMESTAMP(3),
  ADD COLUMN "mercado_pago_connected_at" TIMESTAMP(3);

CREATE INDEX "administradores_mercado_pago_user_id_idx" ON "administradores"("mercado_pago_user_id");
