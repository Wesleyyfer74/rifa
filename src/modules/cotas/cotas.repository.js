const prisma = require('../../database/prisma');

function buildCotasData(campanha) {
  return Array.from({ length: campanha.totalCotas }, (_, index) => ({
    campanhaId: campanha.id,
    numero: index + 1,
  }));
}

async function ensureCotas(campanha, client = prisma) {
  const total = await client.cotaCampanha.count({
    where: { campanhaId: campanha.id },
  });

  if (total >= campanha.totalCotas) {
    return;
  }

  await client.cotaCampanha.createMany({
    data: buildCotasData(campanha),
    skipDuplicates: true,
  });
}

async function releaseExpiredReservations(client = prisma) {
  const now = new Date();

  await client.cotaCampanha.updateMany({
    where: {
      status: 'reservado',
      pedido: {
        statusPagamento: 'pendente',
        expiresAt: { lt: now },
      },
    },
    data: {
      status: 'disponivel',
      pedidoId: null,
      reservedAt: null,
    },
  });

  await client.pedido.updateMany({
    where: {
      statusPagamento: 'pendente',
      expiresAt: { lt: now },
    },
    data: {
      statusPagamento: 'expirado',
    },
  });
}

function listByCampaign(campanhaId, client = prisma) {
  return client.cotaCampanha.findMany({
    where: { campanhaId },
    orderBy: { numero: 'asc' },
    select: {
      numero: true,
      status: true,
      pedidoId: true,
      reservedAt: true,
      paidAt: true,
    },
  });
}

function findAvailableByQuantity(campanhaId, quantidade, client = prisma) {
  return client.cotaCampanha.findMany({
    where: {
      campanhaId,
      status: 'disponivel',
    },
    orderBy: { numero: 'asc' },
    take: quantidade,
    select: {
      numero: true,
    },
  });
}

async function listOccupiedNumbers(campanhaId, client = prisma) {
  const cotas = await client.cotaCampanha.findMany({
    where: {
      campanhaId,
      status: {
        in: ['reservado', 'pago'],
      },
    },
    select: {
      numero: true,
    },
  });

  return cotas.map((cota) => cota.numero);
}

function reserveNumbers({ campanhaId, pedidoId, numeros }, client = prisma) {
  return client.cotaCampanha.updateMany({
    where: {
      campanhaId,
      numero: { in: numeros },
      status: 'disponivel',
    },
    data: {
      pedidoId,
      status: 'reservado',
      reservedAt: new Date(),
    },
  });
}

module.exports = {
  ensureCotas,
  releaseExpiredReservations,
  listByCampaign,
  findAvailableByQuantity,
  listOccupiedNumbers,
  reserveNumbers,
};
