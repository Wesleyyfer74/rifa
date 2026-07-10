const prisma = require('../../database/prisma');
const campanhasRepository = require('./campanhas.repository');
const authRepository = require('../auth/auth.repository');
const cotasRepository = require('../cotas/cotas.repository');
const pedidosRepository = require('../pedidos/pedidos.repository');
const asaasService = require('../payments/asaas.service');
const { onPedidoPago } = require('../esteira/esteira.events');
const { presentEsteiraPedido } = require('../esteira/esteira.presenter');
const {
  buildCampaignUrl,
  enqueueCampaignRemarketing,
} = require('./whatsapp-remarketing.service');
const { HttpError } = require('../../utils/http-error');
const { slugify } = require('../../utils/slugify');
const {
  getCampanhaBySlugParams,
  parseOrThrow,
} = require('../../validators/public-api.validators');

const MIN_ORDER_VALUE = 5;

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
      const cotasReservadas = cotas.filter((cota) => cota.status === 'reservado').length;
      const cotasPagas = cotas.filter((cota) => cota.status === 'pago').length;

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
        metadata: campanha.metadata,
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
        resumo_cotas: {
          disponiveis: cotas.filter((cota) => cota.status === 'disponivel').length,
          reservadas: cotasReservadas,
          pagas: cotasPagas,
        },
      };
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function getEsteiraBySlug(req, res, next) {
  try {
    const { slug } = parseOrThrow(getCampanhaBySlugParams, req.params);
    const pedidos = await pedidosRepository.listLatestPaidByCampaignSlug(slug, 10);

    return res.json({
      data: pedidos.map(presentEsteiraPedido),
    });
  } catch (error) {
    return next(error);
  }
}

async function streamEsteiraBySlug(req, res, next) {
  try {
    const { slug } = parseOrThrow(getCampanhaBySlugParams, req.params);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write('event: ready\n');
    res.write(`data: ${JSON.stringify({ slug })}\n\n`);

    const unsubscribe = onPedidoPago(slug, (payload) => {
      res.write('event: pedido-pago\n');
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    req.on('close', unsubscribe);
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

async function listAdmin(req, res, next) {
  try {
    const campanhas = await campanhasRepository.listAdmin({
      usuarioClienteId: req.query.usuario_id || req.query.usuarioClienteId,
      administradorId: req.admin_id,
      status: req.query.status,
    });

    return res.json({ data: campanhas });
  } catch (error) {
    return next(error);
  }
}

async function verificarDisparo(req, res, next) {
  try {
    const campanha = await campanhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

    if (!campanha) {
      throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
    }

    const [campanhasAnteriores, contatos] = await Promise.all([
      campanhasRepository.countPreviousForAdmin(campanha),
      campanhasRepository.listUniquePaidBuyerPhonesFromPreviousCampaigns(campanha),
    ]);

    return res.json({
      data: {
        pode_disparar: campanhasAnteriores > 0,
        campanhas_anteriores: campanhasAnteriores,
        contatos_disponiveis: contatos.length,
        motivo: campanhasAnteriores === 0
          ? 'Esta e sua primeira campanha. O banco de dados de leads esta sendo abastecido.'
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function dispararWhatsapp(req, res, next) {
  try {
    const campanha = await campanhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

    if (!campanha) {
      throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
    }

    const campanhasAnteriores = await campanhasRepository.countPreviousForAdmin(campanha);

    if (campanhasAnteriores === 0) {
      throw new HttpError(403, 'Esta e sua primeira campanha. O banco de dados de leads esta sendo abastecido.');
    }

    const contatos = await campanhasRepository.listUniquePaidBuyerPhonesFromPreviousCampaigns(campanha);

    if (!contatos.length) {
      throw new HttpError(422, 'Nenhum comprador pago encontrado em campanhas anteriores.');
    }

    const result = enqueueCampaignRemarketing({ campanha, contatos });

    return res.status(202).json({
      data: {
        status: 'queued',
        campanha_id: campanha.id,
        titulo: campanha.titulo,
        landing_url: buildCampaignUrl(campanha),
        contatos_enfileirados: result.queued,
        mensagem_template: result.message,
        integracao_whatsapp_configurada: result.integration_ready,
      },
    });
  } catch (error) {
    return next(error);
  }
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

async function compradoresStats(req, res, next) {
  try {
    const campanha = await campanhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

    if (!campanha) {
      throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
    }

    const stats = await campanhasRepository.getCompradoresStats(campanha.id, req.admin_id);

    return res.json({
      data: {
        campanha: {
          id: campanha.id,
          titulo: campanha.titulo,
          total_cotas: campanha.totalCotas,
        },
        tempo_real: stats.tempoReal.map((pedido) => ({
          id: pedido.id,
          nome: pedido.nome_comprador,
          whatsapp: pedido.whatsapp_comprador,
          quantidade_cotas: Number(pedido.quantidade_cotas || 0),
          porcentagem_adquirida: Number(pedido.porcentagem_adquirida || 0),
          porcentagem_adquirida_formatada: formatPercent(pedido.porcentagem_adquirida),
          status: pedido.status,
          criado_em: pedido.created_at,
        })),
        ranking_baleias: stats.rankingBaleias.map((comprador, index) => ({
          posicao: index + 1,
          nome: comprador.nome_comprador,
          whatsapp: comprador.whatsapp_comprador,
          total_cotas_pagas: Number(comprador.total_cotas_pagas || 0),
          porcentagem_total: Number(comprador.porcentagem_total || 0),
          porcentagem_total_formatada: formatPercent(comprador.porcentagem_total),
          pedidos_pagos: Number(comprador.pedidos_pagos || 0),
          ultimo_pagamento_em: comprador.ultimo_pagamento_em,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function buildUniqueSlug(title, requestedSlug) {
  const baseSlug = slugify(requestedSlug || title);
  let candidate = baseSlug;
  let suffix = 2;

  while (await campanhasRepository.findBySlug(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isSlugCollision(error) {
  const target = error?.meta?.target;

  return error?.code === 'P2002'
    && (
      (Array.isArray(target) && target.includes('slug'))
      || String(target || '').includes('slug')
    );
}

async function createCampaignWithUniqueSlug(data, title, requestedSlug) {
  const baseSlug = slugify(requestedSlug || title);
  let suffix = 1;

  while (suffix <= 20) {
    const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;

    try {
      return await prisma.$transaction(async (tx) => {
        const campanha = await campanhasRepository.create({
          ...data,
          slug: candidate,
        }, tx);

        await cotasRepository.ensureCotas(campanha, tx);

        return campanha;
      });
    } catch (error) {
      if (!isSlugCollision(error)) {
        throw error;
      }

      suffix += 1;
    }
  }

  throw new HttpError(409, 'Nao foi possivel gerar um slug unico para esta campanha.');
}

function parseJsonField(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new HttpError(422, 'metadata precisa ser um JSON valido.');
  }
}

function parsePositiveNumber(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(422, `${fieldName} precisa ser maior que zero.`);
  }

  return parsed;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(422, `${fieldName} precisa ser um numero inteiro maior que zero.`);
  }

  return parsed;
}

function cleanString(value) {
  const cleaned = String(value || '').trim();
  return cleaned === '' ? null : cleaned;
}

async function ensureAdminHasPaymentGateway(adminId) {
  if (!adminId) return;

  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
    select: {
      mercadoPagoAccessToken: true,
      gatewayPreferido: true,
      asaasApiKey: true,
      asaasWalletId: true,
    },
  });

  const hasAsaasDirect = asaasService.hasDirectAccount(admin);
  const hasAsaasSplit = Boolean(admin?.asaasWalletId && asaasService.isPlatformConfigured());

  if (!admin?.mercadoPagoAccessToken && !hasAsaasSplit && !hasAsaasDirect) {
    throw new HttpError(409, 'Configure o recebimento por Pix no perfil antes de criar campanhas.');
  }
}

async function create(req, res, next) {
  try {
    const {
      usuarioClienteId,
      usuario_id,
      titulo,
      slug,
      descricao,
      regulamento,
      valorCota,
      valor_cota,
      totalCotas,
      total_cotas,
      status,
      imagemUrl,
      imagem_url,
      dataSorteio,
      data_sorteio,
      tipo_campanha,
      metadata = {},
      rifinhas = [],
    } = req.body;

    let ownerId = usuarioClienteId || usuario_id;
    const quotaValue = valorCota ?? valor_cota;
    const quotaTotal = totalCotas ?? total_cotas;
    const uploadedImageUrl = req.file ? `/uploads/campanhas/${req.file.filename}` : null;
    const imageUrl = uploadedImageUrl || imagemUrl || imagem_url;
    const drawDate = dataSorteio ?? data_sorteio;
    const parsedMetadata = parseJsonField(metadata, {});
    const campaignType = cleanString(tipo_campanha || parsedMetadata.tipo_campanha) === 'gratuita'
      ? 'gratuita'
      : 'paga';
    const freeCampaign = campaignType === 'gratuita';
    const normalizedQuotaValue = freeCampaign ? 0 : parsePositiveNumber(quotaValue, 'valor_cota');
    const normalizedQuotaTotal = parsePositiveInteger(quotaTotal, 'total_cotas');
    const minCotasPorPedido = freeCampaign ? 1 : parsePositiveInteger(parsedMetadata.min_cotas_por_pedido || 1, 'min_cotas_por_pedido');
    const maxCotasPorPedido = freeCampaign ? 1 : parsePositiveInteger(parsedMetadata.max_cotas_por_pedido || normalizedQuotaTotal, 'max_cotas_por_pedido');
    const minCotasByValue = freeCampaign ? 1 : Math.ceil(MIN_ORDER_VALUE / normalizedQuotaValue);
    const reservaExpiraMinutos = parsePositiveInteger(parsedMetadata.reserva_expira_minutos || 15, 'reserva_expira_minutos');
    const premioPrincipal = cleanString(parsedMetadata.premio_principal);
    const campaignDescription = cleanString(descricao);
    const campaignRules = cleanString(regulamento);

    if (!freeCampaign) {
      await ensureAdminHasPaymentGateway(req.admin_id);
    }

    if (!titulo || String(titulo).trim().length < 3) {
      throw new HttpError(422, 'titulo precisa ter pelo menos 3 caracteres.');
    }

    if (!premioPrincipal) {
      throw new HttpError(422, 'premio_principal e obrigatorio.');
    }

    if (!campaignDescription) {
      throw new HttpError(422, 'descricao e obrigatoria.');
    }

    if (!campaignRules) {
      throw new HttpError(422, 'regulamento e obrigatorio.');
    }

    if (!['ativo', 'pausado', 'finalizado', 'sorteado'].includes(status || 'ativo')) {
      throw new HttpError(422, 'status invalido.');
    }

    if (minCotasPorPedido > maxCotasPorPedido) {
      throw new HttpError(422, 'min_cotas_por_pedido nao pode ser maior que max_cotas_por_pedido.');
    }

    if (minCotasByValue > maxCotasPorPedido) {
      throw new HttpError(422, `Com este valor de cota, o maximo por compra precisa ser pelo menos ${minCotasByValue} cotas para atingir a compra minima de R$ 5,00.`);
    }

    if (maxCotasPorPedido > normalizedQuotaTotal) {
      throw new HttpError(422, 'max_cotas_por_pedido nao pode ser maior que total_cotas.');
    }

    if (maxCotasPorPedido > 1000) {
      throw new HttpError(422, 'max_cotas_por_pedido nao pode ser maior que 1000.');
    }

    if (reservaExpiraMinutos < 5 || reservaExpiraMinutos > 1440) {
      throw new HttpError(422, 'reserva_expira_minutos precisa estar entre 5 e 1440.');
    }

    const normalizedDrawDate = drawDate ? new Date(drawDate) : null;
    if (normalizedDrawDate && Number.isNaN(normalizedDrawDate.getTime())) {
      throw new HttpError(422, 'data_sorteio invalida.');
    }

    if (!uploadedImageUrl && req.admin_id) {
      throw new HttpError(422, 'O arquivo de imagem e obrigatorio.');
    }

    if (req.admin && !ownerId) {
      const mirrorOwner = await authRepository.findOrCreateOwnerMirror({
        id: req.admin.id,
        nome: req.admin.nome,
        email: req.admin.email,
        whatsapp: req.admin.whatsapp,
        password: 'admin-auth-managed',
      });
      ownerId = mirrorOwner.id;
    }

    if (!ownerId || !titulo || quotaValue === undefined || quotaValue === null || !quotaTotal) {
      throw new HttpError(422, 'usuarioClienteId, titulo, valorCota e totalCotas sao obrigatorios.');
    }

    const campaignMetadata = {
      ...parsedMetadata,
      tipo_campanha: campaignType,
      sem_fins_lucrativos: freeCampaign,
      premio_principal: premioPrincipal,
      reserva_expira_minutos: reservaExpiraMinutos,
      min_cotas_por_pedido: minCotasPorPedido,
      max_cotas_por_pedido: maxCotasPorPedido,
      valor_minimo_compra: freeCampaign ? 0 : MIN_ORDER_VALUE,
      instrucoes_pagamento: freeCampaign
        ? (cleanString(parsedMetadata.instrucoes_pagamento) || 'Campanha gratuita e sem fins lucrativos. Informe seus dados para garantir uma cota sem pagamento.')
        : cleanString(parsedMetadata.instrucoes_pagamento),
    };

    const campanha = await createCampaignWithUniqueSlug({
      usuarioClienteId: ownerId,
      administradorId: req.admin_id,
      titulo,
      descricao: campaignDescription,
      regulamento: campaignRules,
      valorCota: normalizedQuotaValue,
      totalCotas: normalizedQuotaTotal,
      status: status || 'ativo',
      imagemUrl: imageUrl,
      dataSorteio: normalizedDrawDate,
      metadata: campaignMetadata,
      rifinhas: {
        create: rifinhas.map((rifinha, index) => ({
          titulo: rifinha.titulo,
          descricao: rifinha.descricao,
          valorCota: rifinha.valorCota || rifinha.valor_cota || quotaValue,
          totalCotas: rifinha.totalCotas || rifinha.total_cotas || quotaTotal,
          status: rifinha.status || 'ativo',
          imagemUrl: rifinha.imagemUrl || rifinha.imagem_url,
          ordem: rifinha.ordem ?? index,
        })),
      },
    }, titulo, slug);

    return res.status(201).json({ data: campanha });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = {};
    const allowedFields = [
      'titulo',
      'descricao',
      'regulamento',
      'status',
      'metadata',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    if (req.body.slug !== undefined) {
      data.slug = req.body.slug || slugify(req.body.titulo || '');
    }

    if (req.body.valorCota !== undefined || req.body.valor_cota !== undefined) {
      data.valorCota = req.body.valorCota ?? req.body.valor_cota;
    }

    if (req.body.totalCotas !== undefined || req.body.total_cotas !== undefined) {
      data.totalCotas = req.body.totalCotas ?? req.body.total_cotas;
    }

    if (req.body.imagemUrl !== undefined || req.body.imagem_url !== undefined) {
      data.imagemUrl = req.body.imagemUrl ?? req.body.imagem_url;
    }

    if (req.body.dataSorteio !== undefined || req.body.data_sorteio !== undefined) {
      const dataSorteio = req.body.dataSorteio ?? req.body.data_sorteio;
      data.dataSorteio = dataSorteio ? new Date(dataSorteio) : null;
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError(422, 'Informe pelo menos um campo para atualizar.');
    }

    if (req.admin_id) {
      const ownedCampanha = await campanhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

      if (!ownedCampanha) {
        throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
      }
    }

    const campanha = await campanhasRepository.update(req.params.id, data);

    return res.json({ data: campanha });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    if (req.admin_id) {
      const ownedCampanha = await campanhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

      if (!ownedCampanha) {
        throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
      }
    }

    await campanhasRepository.remove(req.params.id);
    return res.status(204).send();
  } catch (error) {
    const message = String(error.message || '');

    if (
      error.code === 'P2003'
      || message.includes('pedidos_campanha_id_fkey')
      || message.includes('violates RESTRICT')
      || message.includes('is referenced from table "pedidos"')
    ) {
      return next(new HttpError(409, 'Esta campanha ja possui pedidos. Para preservar o historico de vendas, finalize a campanha em vez de excluir.'));
    }

    return next(error);
  }
}

async function finalizarCampanha(req, res, next) {
  try {
    const ownedCampanha = await campanhasRepository.findByIdForAdmin(req.params.id, req.admin_id);

    if (!ownedCampanha) {
      throw new HttpError(404, 'Campanha nao encontrada para este administrador.');
    }

    if (['finalizado', 'sorteado'].includes(ownedCampanha.status)) {
      return res.json({ data: ownedCampanha });
    }

    const campanha = await campanhasRepository.finalizar(req.params.id);

    return res.json({ data: campanha });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPublic,
  getPublicBySlug,
  getEsteiraBySlug,
  streamEsteiraBySlug,
  listByOwner,
  listAdmin,
  verificarDisparo,
  dispararWhatsapp,
  compradoresStats,
  create,
  update,
  remove,
  finalizarCampanha,
};
