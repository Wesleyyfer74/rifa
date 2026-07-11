const prisma = require('../../database/prisma');

async function getHistoricoByAdminId(adminId, client = prisma) {
  const [campanhasAntigas, clientesAntigos] = await Promise.all([
    client.$queryRaw`
      SELECT
        c.id,
        c.titulo,
        c.slug,
        c.status::text AS status,
        c.imagem_url,
        c.total_cotas,
        c.valor_cota,
        c.data_sorteio,
        c.metadata,
        c.created_at,
        c.updated_at,
        COALESCE(COUNT(p.id) FILTER (WHERE p.status_pagamento::text = 'pago'), 0)::int AS pedidos_pagos,
        COALESCE(SUM(p.valor_total) FILTER (WHERE p.status_pagamento::text = 'pago'), 0)::numeric AS receita_total,
        COALESCE(SUM(cardinality(p.cotas)) FILTER (WHERE p.status_pagamento::text = 'pago'), 0)::int AS cotas_vendidas
      FROM campanhas c
      LEFT JOIN pedidos p ON p.campanha_id = c.id
      WHERE c.admin_id = ${adminId}::uuid
        AND c.status::text IN ('finalizado', 'sorteado')
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
    client.$queryRaw`
      SELECT
        comprador.nome,
        comprador.whatsapp,
        SUM(comprador.valor_total)::numeric AS total_gasto_sistema,
        COUNT(DISTINCT comprador.campanha_id)::int AS quantidade_campanhas_participou,
        SUM(comprador.quantidade_cotas)::int AS total_cotas_compradas,
        MAX(comprador.ultimo_pedido_em) AS ultimo_pedido_em
      FROM (
        SELECT
          COALESCE(NULLIF(TRIM(p.nome_comprador), ''), 'Comprador') AS nome,
          REGEXP_REPLACE(COALESCE(p.whatsapp_comprador, ''), '[^0-9]', '', 'g') AS whatsapp,
          p.campanha_id,
          SUM(p.valor_total) AS valor_total,
          SUM(cardinality(p.cotas)) AS quantidade_cotas,
          MAX(p.created_at) AS ultimo_pedido_em
        FROM pedidos p
        INNER JOIN campanhas c ON c.id = p.campanha_id
        WHERE c.admin_id = ${adminId}::uuid
          AND c.status::text IN ('finalizado', 'sorteado')
          AND p.status_pagamento::text = 'pago'
          AND REGEXP_REPLACE(COALESCE(p.whatsapp_comprador, ''), '[^0-9]', '', 'g') <> ''
        GROUP BY
          REGEXP_REPLACE(COALESCE(p.whatsapp_comprador, ''), '[^0-9]', '', 'g'),
          COALESCE(NULLIF(TRIM(p.nome_comprador), ''), 'Comprador'),
          p.campanha_id
      ) comprador
      GROUP BY comprador.whatsapp, comprador.nome
      ORDER BY total_gasto_sistema DESC, quantidade_campanhas_participou DESC, ultimo_pedido_em DESC
    `,
  ]);

  return {
    campanhasAntigas,
    clientesAntigos,
  };
}

module.exports = {
  getHistoricoByAdminId,
};
