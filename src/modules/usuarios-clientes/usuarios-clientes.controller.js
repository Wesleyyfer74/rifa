const usuariosRepository = require('./usuarios-clientes.repository');
const { HttpError } = require('../../utils/http-error');

async function create(req, res, next) {
  try {
    const { nome, email, whatsapp, senhaHash } = req.body;

    if (!nome || !email || !senhaHash) {
      throw new HttpError(422, 'nome, email e senhaHash são obrigatórios.');
    }

    const usuario = await usuariosRepository.create({
      nome,
      email,
      whatsapp,
      senhaHash,
    });

    return res.status(201).json({ data: usuario });
  } catch (error) {
    return next(error);
  }
}

module.exports = { create };
