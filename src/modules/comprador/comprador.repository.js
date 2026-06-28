const prisma = require('../../database/prisma');

function normalizeWhatsapp(value) {
  return String(value || '').replace(/\D/g, '');
}

async function findPaidCampaignsByWhatsapp(whatsapp) {
  const normalizedWhatsapp = normalizeWhatsapp(whatsapp);

  return prisma.$queryRaw`
    SELECT
      uc.nome AS dono_nome,
      c.id AS campanha_id,
      c.titulo AS campanha_titulo,
      c.slug AS campanha_slug,
      c.total_cotas AS total_cotas,
      SUM(cardinality(p.cotas))::int AS quantidade_cotas,
      ROUND(((SUM(cardinality(p.cotas))::numeric / NULLIF(c.total_cotas, 0)) * 100), 2)::float AS chance_percentual
    FROM pedidos p
    INNER JOIN campanhas c ON c.id = p.campanha_id
    INNER JOIN usuarios_clientes uc ON uc.id = c.usuario_id
    WHERE p.status_pagamento::text = 'pago'
      AND regexp_replace(p.whatsapp_comprador, '\\D', '', 'g') = ${normalizedWhatsapp}
    GROUP BY uc.nome, c.id, c.titulo, c.slug, c.total_cotas
    ORDER BY MAX(p.paid_at) DESC NULLS LAST, MAX(p.created_at) DESC
  `;
}

module.exports = {
  findPaidCampaignsByWhatsapp,
  normalizeWhatsapp,
};
