const crypto = require('crypto');
const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');

const BASE_URL = 'https://api.mercadopago.com';

function assertConfigured() {
  if (!env.mercadoPagoAccessToken) {
    throw new HttpError(500, 'MERCADO_PAGO_ACCESS_TOKEN nao configurado.');
  }
}

function buildPayerEmail(pedido) {
  if (pedido.compradorEmail) {
    return pedido.compradorEmail;
  }

  return `pedido-${pedido.id}@rifadocipriano.local`;
}

async function createPixPayment(pedido) {
  assertConfigured();

  const notificationUrl = `${env.publicAppUrl.replace(/\/$/, '')}/api/v1/webhooks/pagamento`;
  const body = {
    transaction_amount: Number(pedido.valorTotal),
    description: `Pedido ${pedido.id} - Rifa Do Cipriano`,
    payment_method_id: 'pix',
    external_reference: pedido.id,
    notification_url: notificationUrl,
    payer: {
      email: buildPayerEmail(pedido),
      first_name: pedido.compradorNome,
    },
  };

  const response = await fetch(`${BASE_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': pedido.id,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new HttpError(502, `Falha ao gerar PIX no Mercado Pago: ${JSON.stringify(data)}`);
  }

  const transactionData = data.point_of_interaction?.transaction_data;

  if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
    throw new HttpError(502, 'Mercado Pago nao retornou os dados PIX esperados.');
  }

  return {
    provider: 'mercado_pago',
    paymentId: String(data.id),
    status: data.status,
    pixCopiaCola: transactionData.qr_code,
    pixQrCode: transactionData.qr_code_base64,
    raw: data,
  };
}

async function getPayment(paymentId) {
  assertConfigured();

  const response = await fetch(`${BASE_URL}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new HttpError(502, `Falha ao consultar pagamento no Mercado Pago: ${JSON.stringify(data)}`);
  }

  return data;
}

function extractPaymentId(req) {
  return req.body?.data?.id
    || req.body?.id
    || req.body?.resource?.split('/').pop()
    || req.query?.['data.id']
    || req.query?.id;
}

function validateWebhookSignature(req) {
  if (!env.mercadoPagoWebhookSecret) {
    throw new HttpError(500, 'MERCADO_PAGO_WEBHOOK_SECRET nao configurado.');
  }

  const signatureHeader = req.get('x-signature');
  const requestId = req.get('x-request-id');
  const paymentId = extractPaymentId(req);

  if (!signatureHeader || !requestId || !paymentId) {
    throw new HttpError(401, 'Webhook sem assinatura Mercado Pago valida.');
  }

  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => {
    const [key, value] = part.trim().split('=');
    return [key, value];
  }));

  if (!parts.ts || !parts.v1) {
    throw new HttpError(401, 'Assinatura Mercado Pago incompleta.');
  }

  const manifest = `id:${paymentId};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto
    .createHmac('sha256', env.mercadoPagoWebhookSecret)
    .update(manifest)
    .digest('hex');

  const received = Buffer.from(parts.v1, 'hex');
  const calculated = Buffer.from(expected, 'hex');

  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) {
    throw new HttpError(401, 'Assinatura Mercado Pago invalida.');
  }

  return { paymentId: String(paymentId) };
}

module.exports = {
  createPixPayment,
  getPayment,
  validateWebhookSignature,
  extractPaymentId,
};
