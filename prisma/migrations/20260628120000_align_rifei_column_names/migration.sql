ALTER TABLE "campanhas"
  RENAME COLUMN "usuario_cliente_id" TO "usuario_id";

ALTER TABLE "pedidos"
  RENAME COLUMN "comprador_nome" TO "nome_comprador";

ALTER TABLE "pedidos"
  RENAME COLUMN "comprador_whatsapp" TO "whatsapp_comprador";

ALTER TABLE "pedidos"
  RENAME COLUMN "cotas_reservadas" TO "cotas";
