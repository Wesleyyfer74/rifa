const { Prisma } = require('@prisma/client');
const prisma = require('../../database/prisma');
const campanhasRepository = require('../campanhas/campanhas.repository');
const cotasRepository = require('../cotas/cotas.repository');
const pedidosRepository = require('./pedidos.repository');
const { HttpError } = require('../../utils/http-error');

const RESERVA_EXPIRA_EM_MINUTOS = 15;
const MAX_TRANSACTION_RETRIES = 3;

function normalizeNumbers(values) {
  return [...new Set(values.map(Number))].sort((a, b) => a - b);
}

function isRetryablePrismaConflict(error) {
  return error.code === 'P2034'
    || error.code === 'RESERVA_RETRY'
    || error.message?.toLowerCase().includes('write conflict');
}

async function runSerializableWithRetry(callback) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      lastError = error;

      if (!isRetryablePrismaConflict(error) || attempt === MAX_TRANSACTION_RETRIES) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function reservePendingOrder(input) {
  return runSerializableWithRetry(async (tx) => {
    await cotasRepository.releaseExpiredReservations(tx);

    const campanha = await campanhasRepository.findById(input.campanhaId, tx);

    if (!campanha || campanha.status !== 'ativo') {
      throw new HttpError(404, 'Campanha ativa nao encontrada.');
    }

    await cotasRepository.ensureCotas(campanha, tx);

    let numeros = input.numeros;

    if (input.quantidade) {
      const available = await cotasRepository.findAvailableByQuantity(campanha.id, input.quantidade, tx);

      if (available.length < input.quantidade) {
        throw new HttpError(409, 'Nao existem cotas disponiveis suficientes.');
      }

      numeros = available.map((cota) => cota.numero);
    }

    numeros = normalizeNumbers(numeros);

    const hasInvalidCota = numeros.some((numero) => numero < 1 || numero > campanha.totalCotas);

    if (hasInvalidCota) {
      throw new HttpError(422, 'Existem cotas fora do intervalo da campanha.');
    }

    const valorTotal = Number(campanha.valorCota) * numeros.length;
    const expiresAt = new Date(Date.now() + RESERVA_EXPIRA_EM_MINUTOS * 60 * 1000);

    const pedido = await tx.pedido.create({
      data: {
        campanhaId: campanha.id,
        compradorNome: input.compradorNome,
        compradorWhatsapp: input.compradorWhatsapp,
        compradorEmail: input.compradorEmail,
        cotasReservadas: numeros,
        statusPagamento: 'pendente',
        valorTotal,
        expiresAt,
      },
    });

    const reserved = await cotasRepository.reserveNumbers({
      campanhaId: campanha.id,
      pedidoId: pedido.id,
      numeros,
    }, tx);

    if (reserved.count !== numeros.length) {
      if (input.quantidade) {
        const retryError = new Error('Concorrencia detectada ao reservar cotas automaticas.');
        retryError.code = 'RESERVA_RETRY';
        throw retryError;
      }

      throw new HttpError(409, 'Uma ou mais cotas ja foram reservadas por outro comprador.');
    }

    return pedidosRepository.findById(pedido.id, tx);
  });
}

module.exports = {
  reservePendingOrder,
};
