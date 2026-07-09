const asaasService = require('./asaas.service');
const { HttpError } = require('../../utils/http-error');

function dueDateFromPedido(pedido) {
  const date = pedido.expiresAt ? new Date(pedido.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function buildCustomerPayload(pedido) {
  const phone = String(pedido.compradorWhatsapp || '').replace(/\D/g, '');
  return {
    name: pedido.compradorNome,
    email: pedido.compradorEmail || `pedido-${pedido.id}@rifas.local`,
    mobilePhone: phone || undefined,
  };
}

async function findOrCreateCustomer(pedido, credentials) {
  const customer = buildCustomerPayload(pedido);
  const search = await asaasService.requestAsaas({
    ...credentials,
    path: `/customers?email=${encodeURIComponent(customer.email)}`,
  });

  if (Array.isArray(search.data) && search.data[0]?.id) {
    return search.data[0].id;
  }

  const created = await asaasService.requestAsaas({
    ...credentials,
    method: 'POST',
    path: '/customers',
    body: customer,
  });

  if (!created.id) {
    throw new HttpError(502, 'Asaas nao retornou o cliente criado.');
  }

  return created.id;
}

async function createPixPayment(pedido, credentials) {
  const customerId = await findOrCreateCustomer(pedido, credentials);
  const split = credentials.split?.walletId
    ? [{
        walletId: credentials.split.walletId,
        percentualValue: Number(credentials.split.percentualValue),
      }]
    : undefined;

  const payment = await asaasService.requestAsaas({
    ...credentials,
    method: 'POST',
    path: '/payments',
    body: {
      customer: customerId,
      billingType: 'PIX',
      value: Number(pedido.valorTotal),
      dueDate: dueDateFromPedido(pedido),
      description: `Pedido ${pedido.id} - ${pedido.campanha?.titulo || 'Rifa'}`,
      externalReference: pedido.id,
      split,
    },
  });

  if (!payment.id) {
    throw new HttpError(502, 'Asaas nao retornou o ID da cobranca PIX.');
  }

  const qrCode = await asaasService.requestAsaas({
    ...credentials,
    path: `/payments/${payment.id}/pixQrCode`,
  });

  if (!qrCode.payload || !qrCode.encodedImage) {
    throw new HttpError(502, 'Asaas nao retornou QR Code PIX esperado.');
  }

  return {
    provider: 'asaas',
    paymentId: String(payment.id),
    status: payment.status,
    pixCopiaCola: qrCode.payload,
    pixQrCode: qrCode.encodedImage,
    raw: {
      payment,
      pixQrCode: qrCode,
    },
  };
}

module.exports = {
  createPixPayment,
};
