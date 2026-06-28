const campanhasRepository = require('../campanhas/campanhas.repository');
const pedidosRepository = require('./pedidos.repository');
const pedidosService = require('./pedidos.service');
const { HttpError } = require('../../utils/http-error');
const {
  reservarPedidoBody,
  pedidoStatusParams,
  parseOrThrow,
} = require('../../validators/public-api.validators');

async function reservar(req, res, next) {
  try {
    const body = parseOrThrow(reservarPedidoBody, req.body);

    const pedido = await pedidosService.reservePendingOrder({
      campanhaId: body.campanha_id || body.campanhaId,
      compradorNome: body.nome_comprador || body.nome || body.compradorNome,
      compradorWhatsapp: body.whatsapp_comprador || body.whatsapp || body.compradorWhatsapp,
      compradorEmail: body.compradorEmail,
      quantidade: body.quantidade || body.quantidade_cotas || body.quantidadeCotas,
      numeros: body.cotas || body.numeros || body.cotasReservadas,
    });

    return res.status(201).json({
      success: true,
      message: 'Reserva criada com sucesso.',
      data: {
        id: pedido.id,
        campanha_id: pedido.campanhaId,
        status_pagamento: pedido.statusPagamento,
        cotas: pedido.cotasReservadas,
        quantidade_cotas: pedido.cotasReservadas.length,
        chance_percentual: pedido.chancePercentual,
        chance_percentual_label: pedido.chancePercentualLabel,
        valor_total: Number(pedido.valorTotal),
        expires_at: pedido.expiresAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  return reservar(req, res, next);
}

async function getById(req, res, next) {
  try {
    const pedido = await pedidosRepository.findById(req.params.id);

    if (!pedido) {
      throw new HttpError(404, 'Pedido nao encontrado.');
    }

    return res.json({ data: pedido });
  } catch (error) {
    return next(error);
  }
}

async function getStatus(req, res, next) {
  try {
    const params = parseOrThrow(pedidoStatusParams, req.params);
    const pedido = await pedidosRepository.findById(params.pedido_id || params.id);

    if (!pedido) {
      throw new HttpError(404, 'Pedido nao encontrado.');
    }

    return res.json({
      data: {
        id: pedido.id,
        campanha_id: pedido.campanhaId,
        status_pagamento: pedido.statusPagamento,
        pago: pedido.statusPagamento === 'pago',
        expirado: pedido.statusPagamento === 'expirado',
        valor_total: Number(pedido.valorTotal),
        cotas_reservadas: pedido.cotasReservadas,
        expires_at: pedido.expiresAt,
        paid_at: pedido.paidAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(req, res, next) {
  try {
    const pedidos = await pedidosRepository.listForAdmin({
      campanhaId: req.query.campanha_id,
      statusPagamento: req.query.status_pagamento,
      administradorId: req.admin_id,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    });

    return res.json({
      data: pedidos.map((pedido) => ({
        id: pedido.id,
        campanha_id: pedido.campanhaId,
        campanha: pedido.campanha,
        rifinha: pedido.rifinha,
        nome_comprador: pedido.compradorNome,
        whatsapp_comprador: pedido.compradorWhatsapp,
        cotas: pedido.cotasReservadas,
        status_pagamento: pedido.statusPagamento,
        valor_total: Number(pedido.valorTotal),
        expires_at: pedido.expiresAt,
        paid_at: pedido.paidAt,
        created_at: pedido.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  reservar,
  create,
  getById,
  getStatus,
  listAdmin,
};
