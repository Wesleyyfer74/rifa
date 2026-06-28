const prisma = require('../../database/prisma');

function create(data, client = prisma) {
  return client.pedido.create({
    data,
    include: {
      campanha: true,
      rifinha: true,
      cotas: {
        orderBy: { numero: 'asc' },
      },
    },
  });
}

function findById(id, client = prisma) {
  return client.pedido.findUnique({
    where: { id },
    include: {
      campanha: true,
      rifinha: true,
      cotas: {
        orderBy: { numero: 'asc' },
      },
    },
  });
}

function findOpenByCampaignAndCotas(campanhaId, cotas, client = prisma) {
  return client.pedido.findMany({
    where: {
      campanhaId,
      statusPagamento: {
        in: ['pendente', 'pago'],
      },
      cotasReservadas: {
        hasSome: cotas,
      },
    },
  });
}

function listForAdmin(filters = {}, client = prisma) {
  const where = {};

  if (filters.campanhaId) {
    where.campanhaId = filters.campanhaId;
  }

  if (filters.statusPagamento) {
    where.statusPagamento = filters.statusPagamento;
  }

  return client.pedido.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100,
    include: {
      campanha: {
        select: {
          id: true,
          titulo: true,
          slug: true,
          imagemUrl: true,
        },
      },
      rifinha: {
        select: {
          id: true,
          titulo: true,
        },
      },
      cotas: {
        orderBy: { numero: 'asc' },
        select: {
          numero: true,
          status: true,
        },
      },
    },
  });
}

function listLatestPaidByCampaignSlug(slug, limit = 10, client = prisma) {
  return client.pedido.findMany({
    where: {
      statusPagamento: 'pago',
      campanha: {
        slug,
      },
    },
    orderBy: [
      { paidAt: 'desc' },
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    include: {
      campanha: {
        select: {
          id: true,
          slug: true,
          titulo: true,
          totalCotas: true,
        },
      },
    },
  });
}

module.exports = {
  create,
  findById,
  findOpenByCampaignAndCotas,
  listForAdmin,
  listLatestPaidByCampaignSlug,
};
