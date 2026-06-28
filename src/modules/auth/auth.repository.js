const prisma = require('../../database/prisma');

function createAdministrador(data, client = prisma) {
  return client.administrador.create({
    data,
  });
}

function findAdministradorByEmail(email, client = prisma) {
  return client.administrador.findUnique({
    where: { email },
  });
}

function findAdministradorById(id, client = prisma) {
  return client.administrador.findUnique({
    where: { id },
  });
}

function findOrCreateOwnerMirror(admin, client = prisma) {
  return client.usuarioCliente.upsert({
    where: { email: admin.email },
    update: {
      nome: admin.nome,
      whatsapp: admin.whatsapp,
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
  createAdministrador,
  findAdministradorByEmail,
  findAdministradorById,
  findOrCreateOwnerMirror,
};
