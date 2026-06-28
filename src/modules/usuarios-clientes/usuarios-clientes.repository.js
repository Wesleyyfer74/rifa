const prisma = require('../../database/prisma');

function create(data) {
  return prisma.usuarioCliente.create({ data });
}

function findById(id) {
  return prisma.usuarioCliente.findUnique({
    where: { id },
    include: {
      campanhas: true,
    },
  });
}

function findByEmail(email) {
  return prisma.usuarioCliente.findUnique({
    where: { email },
  });
}

module.exports = {
  create,
  findById,
  findByEmail,
};
