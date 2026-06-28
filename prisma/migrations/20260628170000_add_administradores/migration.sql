CREATE TABLE "administradores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(160) NOT NULL,
  "email" VARCHAR(180) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "whatsapp" VARCHAR(30),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "administradores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "administradores_email_key" ON "administradores"("email");

ALTER TABLE "campanhas" ADD COLUMN "admin_id" UUID;

CREATE INDEX "campanhas_admin_id_idx" ON "campanhas"("admin_id");

ALTER TABLE "campanhas"
  ADD CONSTRAINT "campanhas_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "administradores"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
