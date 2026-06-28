const { Prisma } = require('@prisma/client');
const { randomInt } = require('crypto');
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

function formatChancePercent(cotasCount, totalCotas) {
  return `${((cotasCount / totalCotas) * 100).toFixed(2)}%`;
}

function sampleRandomAvailableNumbers({ totalCotas, occupiedNumbers, quantidade }) {
  const occupied = new Set(occupiedNumbers);
  const availableCount = totalCotas - occupied.size;

  if (availableCount < quantidade) {
    throw new HttpError(409, 'Nao existem cotas disponiveis suficientes.');
  }

  const selected = new Set();
  const shouldUseDirectSampling = availableCount > quantidade * 4;
  const maxAttempts = quantidade * 25;
  let attempts = 0;

  if (shouldUseDirectSampling) {
    while (selected.size < quantidade && attempts < maxAttempts) {
      attempts += 1;
      const numero = randomInt(1, totalCotas + 1);

      if (!occupied.has(numero)) {
        selected.add(numero);
      }
    }

    if (selected.size === quantidade) {
      return normalizeNumbers([...selected]);
    }
  }

  const available = [];

  for (let numero = 1; numero <= totalCotas; numero += 1) {
    if (!occupied.has(numero)) {
      available.push(numero);
    }
  }

  for (let index = available.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }

  return normalizeNumbers(available.slice(0, quantidade));
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
        if (error.code === 'RESERVA_RETRY') {
          throw new HttpError(400, 'Nao foi possivel reservar cotas automaticamente. Tente novamente.');
        }

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
      const occupiedNumbers = await cotasRepository.listOccupiedNumbers(campanha.id, tx);

      numeros = sampleRandomAvailableNumbers({
        totalCotas: campanha.totalCotas,
        occupiedNumbers,
        quantidade: input.quantidade,
      });
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

      throw new HttpError(400, 'Uma ou mais cotas ja estao reservadas ou pagas.');
    }

    const reservedPedido = await pedidosRepository.findById(pedido.id, tx);

    return {
      ...reservedPedido,
      chancePercentual: Number(((numeros.length / campanha.totalCotas) * 100).toFixed(2)),
      chancePercentualLabel: formatChancePercent(numeros.length, campanha.totalCotas),
    };
  });
}

module.exports = {
  formatChancePercent,
  reservePendingOrder,
  sampleRandomAvailableNumbers,
};
