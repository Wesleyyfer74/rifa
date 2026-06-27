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
      compradorNome: body.nome || body.compradorNome,
      compradorWhatsapp: body.whatsapp || body.compradorWhatsapp,
      compradorEmail: body.compradorEmail,
      quantidade: body.quantidade,
      numeros: body.numeros || body.cotasReservadas,
    });

    return res.status(201).json({
      data: {
        id: pedido.id,
        campanha_id: pedido.campanhaId,
        status_pagamento: pedido.statusPagamento,
        cotas_reservadas: pedido.cotasReservadas,
        valor_total: Number(pedido.valorTotal),
        expires_at: pedido.expiresAt,
        pix_copia_cola: pedido.pixCopiaCola,
        pix_qr_code: pedido.pixQrCode,
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

module.exports = {
  reservar,
  create,
  getById,
  getStatus,
};
