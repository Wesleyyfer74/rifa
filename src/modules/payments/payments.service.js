const prisma = require('../../database/prisma');
const asaasProvider = require('./asaas.provider');
const asaasService = require('./asaas.service');
const mercadoPago = require('./mercado-pago.provider');
const mercadoPagoOAuth = require('./mercado-pago-oauth.service');
const { env } = require('../../config/env');
const { emitPedidoPago } = require('../esteira/esteira.events');
const { presentEsteiraPedido } = require('../esteira/esteira.presenter');
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
  const pix = await createPixByAdminGateway(pedido);

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

async function createPixByAdminGateway(pedido) {
  const adminId = pedido.campanha?.administradorId;

  if (!adminId) {
    const accessToken = await resolveMercadoPagoAccessToken(null);
    return mercadoPago.createPixPayment(pedido, accessToken);
  }

  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  const hasAsaasDirect = asaasService.hasDirectAccount(admin);
  const hasAsaasSplit = Boolean(admin?.asaasWalletId && asaasService.isPlatformConfigured());

  if (!admin?.mercadoPagoAccessToken && !hasAsaasSplit && !hasAsaasDirect) {
    throw new HttpError(409, 'Ative a carteira Asaas no perfil do dono da rifa antes de vender.');
  }

  if (admin.gatewayPreferido === 'asaas_proprio' && hasAsaasDirect) {
    const credentials = await asaasService.getAdminCredentials(adminId);
    return asaasProvider.createPixPayment(pedido, credentials);
  }

  if (admin.gatewayPreferido === 'asaas' && hasAsaasSplit) {
    const credentials = await asaasService.getAdminCredentials(adminId);
    return asaasProvider.createPixPayment(pedido, credentials);
  }

  if (admin.mercadoPagoAccessToken) {
    const accessToken = await mercadoPagoOAuth.getAdminAccessToken(adminId);
    return mercadoPago.createPixPayment(pedido, accessToken);
  }

  if (hasAsaasSplit) {
    const credentials = await asaasService.getAdminCredentials(adminId);
    return asaasProvider.createPixPayment(pedido, credentials);
  }

  throw new HttpError(409, 'Ative a carteira Asaas do dono da rifa antes de vender.');
}

async function markPedidoAsPaid({ gatewayPaymentId, gatewayPayload }) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { gatewayPaymentId: String(gatewayPaymentId) },
      include: {
        campanha: true,
        cotas: true,
      },
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
        campanha: true,
        cotas: {
          orderBy: { numero: 'asc' },
        },
      },
    });
  });
}

async function resolveMercadoPagoAccessToken(adminId) {
  if (adminId) {
    return mercadoPagoOAuth.getAdminAccessToken(adminId);
  }

  if (env.mercadoPagoAccessToken) {
    return env.mercadoPagoAccessToken;
  }

  throw new HttpError(409, 'Conecte o Mercado Pago no perfil do dono da rifa antes de vender.');
}

async function findPedidoByGatewayPaymentId(gatewayPaymentId) {
  return prisma.pedido.findUnique({
    where: { gatewayPaymentId: String(gatewayPaymentId) },
    include: {
      campanha: {
        select: {
          id: true,
          slug: true,
          administradorId: true,
        },
      },
    },
  });
}

function isAsaasPaidStatus(status) {
  return ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(String(status || '').toUpperCase());
}

async function syncPedidoPaymentStatus(pedido) {
  if (!pedido || pedido.statusPagamento !== 'pendente') {
    return pedido;
  }

  if (pedido.gatewayProvider !== 'asaas' || !pedido.gatewayPaymentId) {
    return pedido;
  }

  const adminId = pedido.campanha?.administradorId;
  if (!adminId) {
    return pedido;
  }

  const credentials = await asaasService.getAdminCredentials(adminId);
  const payment = await asaasProvider.getPayment(pedido.gatewayPaymentId, credentials);

  if (isAsaasPaidStatus(payment.status)) {
    const paidPedido = await markPedidoAsPaid({
      gatewayPaymentId: String(payment.id),
      gatewayPayload: {
        source: 'status_sync',
        payment,
      },
    });

    await notifyPaymentConfirmed(paidPedido);
    return paidPedido;
  }

  return prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      gatewayPayload: {
        ...(pedido.gatewayPayload && typeof pedido.gatewayPayload === 'object' ? pedido.gatewayPayload : {}),
        lastStatusSync: {
          checkedAt: new Date().toISOString(),
          status: payment.status || null,
          payment,
        },
      },
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

async function handleWebhook(req) {
  ensureAllowedIp(req);

  if (req.body?.event && req.body?.payment) {
    return handleAsaasWebhook(req);
  }

  if (env.paymentProvider !== 'mercado_pago') {
    return {
      handled: false,
      gateway_status: 'disabled',
      message: 'Webhook ignorado porque PAYMENT_PROVIDER nao esta configurado como mercado_pago.',
    };
  }

  const { paymentId } = mercadoPago.validateWebhookSignature(req);
  const pedidoRegistrado = await findPedidoByGatewayPaymentId(paymentId);
  const accessToken = await resolveMercadoPagoAccessToken(pedidoRegistrado?.campanha?.administradorId);
  const payment = await mercadoPago.getPayment(paymentId, accessToken);
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

async function handleAsaasWebhook(req) {
  if (env.asaasWebhookToken) {
    const received = req.get('asaas-access-token')
      || req.get('access_token')
      || req.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (received !== env.asaasWebhookToken) {
      throw new HttpError(401, 'Webhook Asaas sem token valido.');
    }
  }

  const event = String(req.body.event || '');
  const payment = req.body.payment || {};

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || isAsaasPaidStatus(payment.status)) {
    const pedido = await markPedidoAsPaid({
      gatewayPaymentId: String(payment.id),
      gatewayPayload: req.body,
    });

    await notifyPaymentConfirmed(pedido);

    return {
      handled: true,
      gateway: 'asaas',
      pedido_id: pedido.id,
      status_pagamento: pedido.statusPagamento,
    };
  }

  return {
    handled: false,
    gateway: 'asaas',
    gateway_payment_id: payment.id ? String(payment.id) : null,
    gateway_status: event,
  };
}

async function notifyPaymentConfirmed(pedido) {
  // Futuro ponto de integracao: WhatsApp/SMS/email.
  if (pedido.campanha?.slug) {
    emitPedidoPago(pedido.campanha.slug, presentEsteiraPedido(pedido));
  }

  console.log(`[payments] Pagamento confirmado para pedido ${pedido.id}.`);
}

module.exports = {
  generatePixForPedido,
  handleWebhook,
  notifyPaymentConfirmed,
  syncPedidoPaymentStatus,
};
