const { Prisma } = require('@prisma/client');
const { randomInt } = require('crypto');
const prisma = require('../../database/prisma');
const campanhasRepository = require('../campanhas/campanhas.repository');
const cotasRepository = require('../cotas/cotas.repository');
const pedidosRepository = require('./pedidos.repository');
const { HttpError } = require('../../utils/http-error');

const DEFAULT_RESERVA_EXPIRA_EM_MINUTOS = 15;
const MAX_TRANSACTION_RETRIES = 3;
const MIN_ORDER_VALUE = 5;

function normalizeNumbers(values) {
  return [...new Set(values.map(Number))].sort((a, b) => a - b);
}

function formatChancePercent(cotasCount, totalCotas) {
  return `${((cotasCount / totalCotas) * 100).toFixed(2)}%`;
}

function getCampaignQuotaRules(campanha) {
  const metadata = campanha.metadata && typeof campanha.metadata === 'object' ? campanha.metadata : {};
  const valorCota = Number(campanha.valorCota || 0);
  const minByAmount = valorCota > 0 ? Math.ceil(MIN_ORDER_VALUE / valorCota) : 1;

  return {
    reservaExpiraMinutos: Number(metadata.reserva_expira_minutos || DEFAULT_RESERVA_EXPIRA_EM_MINUTOS),
    minCotasPorPedido: Math.max(Number(metadata.min_cotas_por_pedido || 1), minByAmount),
    maxCotasPorPedido: Number(metadata.max_cotas_por_pedido || 100),
    minValorPedido: MIN_ORDER_VALUE,
  };
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

    const rules = getCampaignQuotaRules(campanha);

    await cotasRepository.ensureCotas(campanha, tx);

    if (!input.quantidade) {
      throw new HttpError(422, 'quantidade_cotas e obrigatoria.');
    }

    const occupiedNumbers = await cotasRepository.listOccupiedNumbers(campanha.id, tx);

    let numeros = sampleRandomAvailableNumbers({
      totalCotas: campanha.totalCotas,
      occupiedNumbers,
      quantidade: input.quantidade,
    });

    numeros = normalizeNumbers(numeros);

    if (numeros.length < rules.minCotasPorPedido) {
      throw new HttpError(422, `Pedido minimo de ${rules.minCotasPorPedido} cota(s).`);
    }

    if (numeros.length > rules.maxCotasPorPedido) {
      throw new HttpError(422, `Pedido maximo de ${rules.maxCotasPorPedido} cota(s).`);
    }

    const hasInvalidCota = numeros.some((numero) => numero < 1 || numero > campanha.totalCotas);

    if (hasInvalidCota) {
      throw new HttpError(422, 'Existem cotas fora do intervalo da campanha.');
    }

    const valorTotal = Number(campanha.valorCota) * numeros.length;

    if (valorTotal < rules.minValorPedido) {
      throw new HttpError(422, `Compra minima de R$ ${rules.minValorPedido.toFixed(2).replace('.', ',')}.`);
    }

    const expiresAt = new Date(Date.now() + rules.reservaExpiraMinutos * 60 * 1000);

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
      const retryError = new Error('Concorrencia detectada ao reservar cotas automaticas.');
      retryError.code = 'RESERVA_RETRY';
      throw retryError;
    }

    const reservedPedido = await pedidosRepository.findById(pedido.id, tx);

    return {
      ...reservedPedido,
      chancePercentual: Number(((numeros.length / campanha.totalCotas) * 100).toFixed(2)),
      chancePercentualLabel: formatChancePercent(numeros.length, campanha.totalCotas),
    };
  });
}

async function cancelPendingOrder(pedidoId, reason = 'Falha ao gerar PIX') {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      select: {
        id: true,
        statusPagamento: true,
      },
    });

    if (!pedido || pedido.statusPagamento !== 'pendente') {
      return pedido;
    }

    await tx.cotaCampanha.updateMany({
      where: {
        pedidoId,
        status: 'reservado',
      },
      data: {
        status: 'disponivel',
        pedidoId: null,
        reservedAt: null,
      },
    });

    return tx.pedido.update({
      where: { id: pedidoId },
      data: {
        statusPagamento: 'cancelado',
        gatewayPayload: {
          cancel_reason: reason,
          canceled_at: new Date().toISOString(),
        },
      },
    });
  });
}

module.exports = {
  cancelPendingOrder,
  formatChancePercent,
  reservePendingOrder,
  sampleRandomAvailableNumbers,
};
