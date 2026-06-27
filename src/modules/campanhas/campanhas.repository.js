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

function create(data, client = prisma) {
  return client.campanha.create({
    data,
    include: {
      rifinhas: true,
    },
  });
}

module.exports = {
  listPublic,
  listByOwner,
  findPublicBySlug,
  findBySlug,
  findById,
  create,
};
