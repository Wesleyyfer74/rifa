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

module.exports = {
  create,
  findById,
  findOpenByCampaignAndCotas,
};
