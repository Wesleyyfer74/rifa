const prisma = require('../../database/prisma');
const rifinhasRepository = require('./rifinhas.repository');
const campanhasRepository = require('../campanhas/campanhas.repository');
const { HttpError } = require('../../utils/http-error');

async function list(req, res, next) {
  try {
    const rifinhas = await rifinhasRepository.list({
      campanhaId: req.query.campanha_id || req.query.campanhaId,
      status: req.query.status,
      administradorId: req.admin_id,
    });

    return res.json({ data: rifinhas });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const campanhaId = req.body.campanha_id || req.body.campanhaId;
    const totalCotas = req.body.total_cotas ?? req.body.totalCotas;
    const valorCota = req.body.valor_cota ?? req.body.valorCota;
    const imagemUrl = req.body.imagem_url ?? req.body.imagemUrl;

    if (!campanhaId || !req.body.titulo || !totalCotas) {
      throw new HttpError(422, 'campanha_id, titulo e total_cotas sao obrigatorios.');
    }

    const rifinha = await prisma.$transaction(async (tx) => {
      const campanha = req.admin_id
        ? await campanhasRepository.findByIdForAdmin(campanhaId, req.admin_id, tx)
        : await campanhasRepository.findById(campanhaId, tx);

      if (!campanha) {
        throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
      }

      return rifinhasRepository.create({
        campanhaId,
        titulo: req.body.titulo,
        descricao: req.body.descricao,
        valorCota: valorCota ?? campanha.valorCota,
        totalCotas,
        status: req.body.status || 'ativo',
        imagemUrl,
        ordem: req.body.ordem ?? 0,
      }, tx);
    });

    return res.status(201).json({ data: rifinha });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    if (req.admin_id) {
      const rifinha = await rifinhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

      if (!rifinha) {
        throw new HttpError(404, 'Rifinha nao encontrada para este administrador.');
      }
    }

    await rifinhasRepository.remove(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  create,
  remove,
};
