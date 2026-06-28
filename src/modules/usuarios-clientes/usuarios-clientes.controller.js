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

async function login(req, res, next) {
  try {
    const { email, senhaHash } = req.body;

    if (!email || !senhaHash) {
      throw new HttpError(422, 'email e senhaHash sao obrigatorios.');
    }

    const usuario = await usuariosRepository.findByEmail(email);

    if (!usuario || usuario.senhaHash !== senhaHash) {
      throw new HttpError(401, 'Credenciais invalidas.');
    }

    return res.json({
      data: {
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          whatsapp: usuario.whatsapp,
          status: usuario.status,
        },
        token: `local-${usuario.id}`,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { create, login };
