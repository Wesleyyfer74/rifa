const prisma = require('../../database/prisma');

function listPublic(client = prisma) {
  return client.campanha.findMany({
    where: { status: 'ativo' },
    orderBy: { createdAt: 'desc' },
    include: {
      rifinhas: {
        where: { status: 'ativo' },
        orderBy: { ordem: 'asc' },
      },
    },
  });
}

function listByOwner(usuarioClienteId, client = prisma) {
  return client.campanha.findMany({
    where: { usuarioClienteId },
    orderBy: { createdAt: 'desc' },
    include: {
      rifinhas: true,
      pedidos: true,
    },
  });
}

function listAdmin(filters = {}, client = prisma) {
  const where = {
    status: {
      in: ['ativo', 'pausado'],
    },
  };

  if (filters.usuarioClienteId) {
    where.usuarioClienteId = filters.usuarioClienteId;
  }

  if (filters.administradorId) {
    where.administradorId = filters.administradorId;
  }

  if (filters.status && ['ativo', 'pausado'].includes(filters.status)) {
    where.status = filters.status;
  }

  return client.campanha.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      rifinhas: true,
      pedidos: {
        select: {
          id: true,
          statusPagamento: true,
          cotasReservadas: true,
          valorTotal: true,
          createdAt: true,
        },
      },
    },
  });
}

function findPublicBySlug(slug, client = prisma) {
  return client.campanha.findFirst({
    where: {
      slug,
    },
    include: {
      rifinhas: {
        where: { status: 'ativo' },
        orderBy: { ordem: 'asc' },
      },
    },
  });
}

function findBySlug(slug, client = prisma) {
  return client.campanha.findUnique({
    where: { slug },
    include: {
      rifinhas: {
        orderBy: { ordem: 'asc' },
      },
    },
  });
}

function findById(id, client = prisma) {
  return client.campanha.findUnique({
    where: { id },
    include: {
      rifinhas: true,
    },
  });
}

function findByIdForAdmin(id, administradorId, client = prisma) {
  return client.campanha.findFirst({
    where: {
      id,
      administradorId,
    },
    include: {
      rifinhas: true,
    },
  });
}

async function countPreviousForAdmin(campanha, client = prisma) {
  return client.campanha.count({
    where: {
      administradorId: campanha.administradorId,
      id: {
        not: campanha.id,
      },
      createdAt: {
        lt: campanha.createdAt,
      },
    },
  });
}

async function listUniquePaidBuyerPhonesFromPreviousCampaigns(campanha, client = prisma) {
  const rows = await client.pedido.findMany({
    where: {
      statusPagamento: 'pago',
      compradorWhatsapp: {
        not: '',
      },
      campanha: {
        administradorId: campanha.administradorId,
        id: {
          not: campanha.id,
        },
        createdAt: {
          lt: campanha.createdAt,
        },
      },
    },
    select: {
      compradorWhatsapp: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const phonesByDigits = new Map();

  rows.forEach((row) => {
    const phone = String(row.compradorWhatsapp || '').trim();
    const digits = phone.replace(/\D/g, '');

    if (digits && !phonesByDigits.has(digits)) {
      phonesByDigits.set(digits, phone);
    }
  });

  return Array.from(phonesByDigits.values());
}

async function getCompradoresStats(campanhaId, administradorId, client = prisma) {
  const [tempoReal, rankingBaleias] = await Promise.all([
    client.$queryRaw`
      WITH campanha_alvo AS (
        SELECT id, total_cotas
        FROM campanhas
        WHERE id = ${campanhaId}::uuid
          AND admin_id = ${administradorId}::uuid
        LIMIT 1
      )
      SELECT
        p.id,
        p.nome_comprador,
        p.whatsapp_comprador,
        cardinality(p.cotas)::int AS quantidade_cotas,
        ROUND((cardinality(p.cotas)::numeric / NULLIF(c.total_cotas, 0)) * 100, 4)::float AS porcentagem_adquirida,
        p.status_pagamento::text AS status,
        p.created_at
      FROM pedidos p
      INNER JOIN campanha_alvo c ON c.id = p.campanha_id
      WHERE p.status_pagamento::text IN ('pago', 'pendente')
      ORDER BY p.created_at DESC
      LIMIT 20
    `,
    client.$queryRaw`
      WITH campanha_alvo AS (
        SELECT id, total_cotas
        FROM campanhas
        WHERE id = ${campanhaId}::uuid
          AND admin_id = ${administradorId}::uuid
        LIMIT 1
      )
      SELECT
        p.nome_comprador,
        p.whatsapp_comprador,
        SUM(cardinality(p.cotas))::int AS total_cotas_pagas,
        ROUND((SUM(cardinality(p.cotas))::numeric / NULLIF(c.total_cotas, 0)) * 100, 4)::float AS porcentagem_total,
        MAX(p.paid_at) AS ultimo_pagamento_em,
        COUNT(p.id)::int AS pedidos_pagos
      FROM pedidos p
      INNER JOIN campanha_alvo c ON c.id = p.campanha_id
      WHERE p.status_pagamento::text = 'pago'
      GROUP BY p.whatsapp_comprador, p.nome_comprador, c.total_cotas
      ORDER BY total_cotas_pagas DESC, ultimo_pagamento_em DESC NULLS LAST
    `,
  ]);

  return {
    tempoReal,
    rankingBaleias,
  };
}

function create(data, client = prisma) {
  return client.campanha.create({
    data,
    include: {
      rifinhas: true,
    },
  });
}

function update(id, data, client = prisma) {
  return client.campanha.update({
    where: { id },
    data,
    include: {
      rifinhas: true,
    },
  });
}

function remove(id, client = prisma) {
  return client.campanha.delete({
    where: { id },
  });
}

function finalizar(id, client = prisma) {
  return client.campanha.update({
    where: { id },
    data: { status: 'finalizado' },
    include: {
      rifinhas: true,
    },
  });
}

module.exports = {
  listPublic,
  listByOwner,
  listAdmin,
  findPublicBySlug,
  findBySlug,
  findById,
  findByIdForAdmin,
  countPreviousForAdmin,
  listUniquePaidBuyerPhonesFromPreviousCampaigns,
  getCompradoresStats,
  create,
  update,
  remove,
  finalizar,
};
