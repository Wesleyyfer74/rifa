const prisma = require('../../database/prisma');

function findById(id, client = prisma) {
  return client.administrador.findUnique({
    where: { id },
  });
}

function findByEmail(email, client = prisma) {
  return client.administrador.findUnique({
    where: { email },
  });
}

function updateById(id, data, client = prisma) {
  return client.administrador.update({
    where: { id },
    data,
  });
}

function syncOwnerMirror(admin, client = prisma) {
  return client.usuarioCliente.upsert({
    where: { email: admin.email },
    update: {
      nome: admin.nome,
      whatsapp: admin.whatsapp,
      senhaHash: admin.password,
    },
    create: {
      nome: admin.nome,
      email: admin.email,
      whatsapp: admin.whatsapp,
      senhaHash: admin.password,
    },
  });
}

module.exports = {
  findById,
  findByEmail,
  updateById,
  syncOwnerMirror,
};
