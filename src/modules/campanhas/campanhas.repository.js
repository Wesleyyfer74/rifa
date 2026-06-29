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
  const where = {};

  if (filters.usuarioClienteId) {
    where.usuarioClienteId = filters.usuarioClienteId;
  }

  if (filters.administradorId) {
    where.administradorId = filters.administradorId;
  }

  if (filters.status) {
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

module.exports = {
  listPublic,
  listByOwner,
  listAdmin,
  findPublicBySlug,
  findBySlug,
  findById,
  findByIdForAdmin,
  create,
  update,
  remove,
};
