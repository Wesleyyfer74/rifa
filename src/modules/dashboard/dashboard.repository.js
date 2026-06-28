const prisma = require('../../database/prisma');

async function getStatsByAdminId(adminId, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [stats] = await prisma.$queryRaw`
    SELECT
      COUNT(DISTINCT c.id) FILTER (WHERE c.status::text = 'ativo')::int AS campanhas_ativas,
      COUNT(p.id) FILTER (
        WHERE p.created_at >= ${startOfToday}
          AND p.created_at < ${startOfTomorrow}
      )::int AS pedidos_hoje,
      COALESCE(SUM(p.valor_total) FILTER (WHERE p.status_pagamento::text = 'pendente'), 0)::numeric AS receita_pendente,
      COALESCE(SUM(cardinality(p.cotas)) FILTER (WHERE p.status_pagamento::text = 'pago'), 0)::int AS cotas_vendidas
    FROM campanhas c
    LEFT JOIN pedidos p ON p.campanha_id = c.id
    WHERE c.admin_id = ${adminId}::uuid
  `;

  return {
    campanhas_ativas: Number(stats?.campanhas_ativas || 0),
    pedidos_hoje: Number(stats?.pedidos_hoje || 0),
    receita_pendente: Number(stats?.receita_pendente || 0),
    cotas_vendidas: Number(stats?.cotas_vendidas || 0),
  };
}

module.exports = {
  getStatsByAdminId,
};
