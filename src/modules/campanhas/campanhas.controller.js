const prisma = require('../../database/prisma');
const campanhasRepository = require('./campanhas.repository');
const cotasRepository = require('../cotas/cotas.repository');
const { HttpError } = require('../../utils/http-error');
const { slugify } = require('../../utils/slugify');
const {
  getCampanhaBySlugParams,
  parseOrThrow,
} = require('../../validators/public-api.validators');

async function listPublic(req, res, next) {
  try {
    const campanhas = await campanhasRepository.listPublic();
    return res.json({ data: campanhas });
  } catch (error) {
    return next(error);
  }
}

async function getPublicBySlug(req, res, next) {
  try {
    const { slug } = parseOrThrow(getCampanhaBySlugParams, req.params);

    const data = await prisma.$transaction(async (tx) => {
      await cotasRepository.releaseExpiredReservations(tx);

      const campanha = await campanhasRepository.findBySlug(slug, tx);

      if (!campanha) {
        throw new HttpError(404, 'Campanha nao encontrada.');
      }

      await cotasRepository.ensureCotas(campanha, tx);

      const cotas = await cotasRepository.listByCampaign(campanha.id, tx);
      const numerosReservados = cotas.filter((cota) => cota.status === 'reservado').map((cota) => cota.numero);
      const numerosPagos = cotas.filter((cota) => cota.status === 'pago').map((cota) => cota.numero);
      const numerosOcupados = cotas.filter((cota) => cota.status === 'reservado' || cota.status === 'pago').map((cota) => cota.numero);

      return {
        id: campanha.id,
        titulo: campanha.titulo,
        slug: campanha.slug,
        descricao: campanha.descricao,
        regulamento: campanha.regulamento,
        valor_cota: Number(campanha.valorCota),
        total_cotas: campanha.totalCotas,
        status: campanha.status,
        imagem_url: campanha.imagemUrl,
        data_sorteio: campanha.dataSorteio,
        rifinhas: campanha.rifinhas.map((rifinha) => ({
          id: rifinha.id,
          titulo: rifinha.titulo,
          descricao: rifinha.descricao,
          valor_cota: Number(rifinha.valorCota),
          total_cotas: rifinha.totalCotas,
          status: rifinha.status,
          imagem_url: rifinha.imagemUrl,
          ordem: rifinha.ordem,
        })),
        cotas: cotas.map((cota) => ({
          numero: cota.numero,
          label: String(cota.numero).padStart(3, '0'),
          status: cota.status,
          disponivel: cota.status === 'disponivel',
          reservado: cota.status === 'reservado',
          pago: cota.status === 'pago',
        })),
        numeros_ocupados: numerosOcupados,
        numeros_reservados: numerosReservados,
        numeros_pagos: numerosPagos,
        resumo_cotas: {
          disponiveis: cotas.filter((cota) => cota.status === 'disponivel').length,
          reservadas: numerosReservados.length,
          pagas: numerosPagos.length,
        },
      };
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function listByOwner(req, res, next) {
  try {
    const campanhas = await campanhasRepository.listByOwner(req.params.id);
    return res.json({ data: campanhas });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(req, res, next) {
  try {
    const campanhas = await campanhasRepository.listAdmin({
      usuarioClienteId: req.query.usuario_id || req.query.usuarioClienteId,
      status: req.query.status,
    });

    return res.json({ data: campanhas });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const {
      usuarioClienteId,
      usuario_id,
      titulo,
      slug,
      descricao,
      regulamento,
      valorCota,
      valor_cota,
      totalCotas,
      total_cotas,
      status = 'pausado',
      imagemUrl,
      imagem_url,
      dataSorteio,
      data_sorteio,
      metadata = {},
      rifinhas = [],
    } = req.body;

    const ownerId = usuarioClienteId || usuario_id;
    const quotaValue = valorCota ?? valor_cota;
    const quotaTotal = totalCotas ?? total_cotas;
    const imageUrl = imagemUrl ?? imagem_url;
    const drawDate = dataSorteio ?? data_sorteio;

    if (!ownerId || !titulo || !quotaValue || !quotaTotal) {
      throw new HttpError(422, 'usuarioClienteId, titulo, valorCota e totalCotas sao obrigatorios.');
    }

    const campanha = await campanhasRepository.create({
      usuarioClienteId: ownerId,
      titulo,
      slug: slug || slugify(titulo),
      descricao,
      regulamento,
      valorCota: quotaValue,
      totalCotas: quotaTotal,
      status,
      imagemUrl: imageUrl,
      dataSorteio: drawDate ? new Date(drawDate) : null,
      metadata,
      rifinhas: {
        create: rifinhas.map((rifinha, index) => ({
          titulo: rifinha.titulo,
          descricao: rifinha.descricao,
          valorCota: rifinha.valorCota || rifinha.valor_cota || quotaValue,
          totalCotas: rifinha.totalCotas || rifinha.total_cotas || quotaTotal,
          status: rifinha.status || 'ativo',
          imagemUrl: rifinha.imagemUrl || rifinha.imagem_url,
          ordem: rifinha.ordem ?? index,
        })),
      },
    });

    await cotasRepository.ensureCotas(campanha);

    return res.status(201).json({ data: campanha });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = {};
    const allowedFields = [
      'titulo',
      'descricao',
      'regulamento',
      'status',
      'metadata',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    if (req.body.slug !== undefined) {
      data.slug = req.body.slug || slugify(req.body.titulo || '');
    }

    if (req.body.valorCota !== undefined || req.body.valor_cota !== undefined) {
      data.valorCota = req.body.valorCota ?? req.body.valor_cota;
    }

    if (req.body.totalCotas !== undefined || req.body.total_cotas !== undefined) {
      data.totalCotas = req.body.totalCotas ?? req.body.total_cotas;
    }

    if (req.body.imagemUrl !== undefined || req.body.imagem_url !== undefined) {
      data.imagemUrl = req.body.imagemUrl ?? req.body.imagem_url;
    }

    if (req.body.dataSorteio !== undefined || req.body.data_sorteio !== undefined) {
      const dataSorteio = req.body.dataSorteio ?? req.body.data_sorteio;
      data.dataSorteio = dataSorteio ? new Date(dataSorteio) : null;
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError(422, 'Informe pelo menos um campo para atualizar.');
    }

    const campanha = await campanhasRepository.update(req.params.id, data);

    return res.json({ data: campanha });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await campanhasRepository.remove(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPublic,
  getPublicBySlug,
  listByOwner,
  listAdmin,
  create,
  update,
  remove,
};
