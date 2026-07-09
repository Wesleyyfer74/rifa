CREATE TABLE IF NOT EXISTS "saques" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL,
  "valor" DECIMAL(10, 2) NOT NULL,
  "pix_chave" VARCHAR(180) NOT NULL,
  "pix_tipo" VARCHAR(30) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'pendente',
  "asaas_transfer_id" VARCHAR(120),
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saques_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "administradores"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "saques_admin_id_idx" ON "saques"("admin_id");
CREATE INDEX IF NOT EXISTS "saques_status_idx" ON "saques"("status");
