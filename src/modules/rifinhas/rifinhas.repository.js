const prisma = require('../../database/prisma');

function list(filters = {}, client = prisma) {
  const where = {};

  if (filters.campanhaId) {
    where.campanhaId = filters.campanhaId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return client.rifinha.findMany({
    where,
    orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    include: {
      campanha: {
        select: {
          id: true,
          titulo: true,
          slug: true,
        },
      },
    },
  });
}

function create(data, client = prisma) {
  return client.rifinha.create({
    data,
    include: {
      campanha: {
        select: {
          id: true,
          titulo: true,
          slug: true,
        },
      },
    },
  });
}

function remove(id, client = prisma) {
  return client.rifinha.delete({
    where: { id },
  });
}

module.exports = {
  list,
  create,
  remove,
};
