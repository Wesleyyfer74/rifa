const prisma = require('../../database/prisma');
const mercadoPago = require('./mercado-pago.provider');
const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');

function ensureAllowedIp(req) {
  if (env.paymentWebhookAllowedIps.length === 0) {
    return;
  }

  const requestIp = req.ip?.replace('::ffff:', '');

  if (!env.paymentWebhookAllowedIps.includes(requestIp)) {
    throw new HttpError(403, 'IP nao autorizado para webhook de pagamento.');
  }
}

async function generatePixForPedido(pedido) {
  if (env.paymentProvider !== 'mercado_pago') {
    throw new HttpError(503, 'Gateway PIX nao configurado. Defina PAYMENT_PROVIDER=mercado_pago e as credenciais do Mercado Pago.');
  }

  const pix = await mercadoPago.createPixPayment(pedido);

  return prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      gatewayProvider: pix.provider,
      gatewayPaymentId: pix.paymentId,
      pixCopiaCola: pix.pixCopiaCola,
      pixQrCode: pix.pixQrCode,
      gatewayPayload: pix.raw,
    },
    include: {
      campanha: true,
      rifinha: true,
      cotas: {
        orderBy: { numero: 'asc' },
      },
    },
  });
}

async function markPedidoAsPaid({ gatewayPaymentId, gatewayPayload }) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { gatewayPaymentId: String(gatewayPaymentId) },
      include: { cotas: true },
    });

    if (!pedido) {
      throw new HttpError(404, 'Pedido nao encontrado para o pagamento informado.');
    }

    if (pedido.statusPagamento === 'pago') {
      return pedido;
    }

    await tx.cotaCampanha.updateMany({
      where: {
        pedidoId: pedido.id,
        status: 'reservado',
      },
      data: {
        status: 'pago',
        paidAt: new Date(),
      },
    });

    return tx.pedido.update({
      where: { id: pedido.id },
      data: {
        statusPagamento: 'pago',
        paidAt: new Date(),
        gatewayPayload,
      },
      include: {
        cotas: {
          orderBy: { numero: 'asc' },
        },
      },
    });
  });
}

async function handleWebhook(req) {
  ensureAllowedIp(req);

  if (env.paymentProvider !== 'mercado_pago') {
    return {
      handled: false,
      gateway_status: 'disabled',
      message: 'Webhook ignorado porque PAYMENT_PROVIDER nao esta configurado como mercado_pago.',
    };
  }

  const { paymentId } = mercadoPago.validateWebhookSignature(req);
  const payment = await mercadoPago.getPayment(paymentId);
  const normalizedStatus = payment.status;

  if (normalizedStatus === 'approved' || normalizedStatus === 'pago') {
    const pedido = await markPedidoAsPaid({
      gatewayPaymentId: String(payment.id),
      gatewayPayload: payment,
    });

    await notifyPaymentConfirmed(pedido);

    return {
      handled: true,
      pedido_id: pedido.id,
      status_pagamento: pedido.statusPagamento,
    };
  }

  return {
    handled: false,
    gateway_payment_id: String(payment.id),
    gateway_status: normalizedStatus,
  };
}

async function notifyPaymentConfirmed(pedido) {
  // Futuro ponto de integracao: WhatsApp/SMS/email.
  console.log(`[payments] Pagamento confirmado para pedido ${pedido.id}.`);
}

module.exports = {
  generatePixForPedido,
  handleWebhook,
  notifyPaymentConfirmed,
};
