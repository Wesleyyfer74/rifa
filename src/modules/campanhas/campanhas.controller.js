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

async function create(req, res, next) {
  try {
    const {
      usuarioClienteId,
      titulo,
      slug,
      descricao,
      regulamento,
      valorCota,
      totalCotas,
      status = 'pausado',
      imagemUrl,
      dataSorteio,
      metadata = {},
      rifinhas = [],
    } = req.body;

    if (!usuarioClienteId || !titulo || !valorCota || !totalCotas) {
      throw new HttpError(422, 'usuarioClienteId, titulo, valorCota e totalCotas sao obrigatorios.');
    }

    const campanha = await campanhasRepository.create({
      usuarioClienteId,
      titulo,
      slug: slug || slugify(titulo),
      descricao,
      regulamento,
      valorCota,
      totalCotas,
      status,
      imagemUrl,
      dataSorteio: dataSorteio ? new Date(dataSorteio) : null,
      metadata,
      rifinhas: {
        create: rifinhas.map((rifinha, index) => ({
          titulo: rifinha.titulo,
          descricao: rifinha.descricao,
          valorCota: rifinha.valorCota || valorCota,
          totalCotas: rifinha.totalCotas || totalCotas,
          status: rifinha.status || 'ativo',
          imagemUrl: rifinha.imagemUrl,
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

module.exports = {
  listPublic,
  getPublicBySlug,
  listByOwner,
  create,
};
