const prisma = require('../../database/prisma');
const campanhasRepository = require('./campanhas.repository');
const authRepository = require('../auth/auth.repository');
const cotasRepository = require('../cotas/cotas.repository');
const pedidosRepository = require('../pedidos/pedidos.repository');
const { onPedidoPago } = require('../esteira/esteira.events');
const { presentEsteiraPedido } = require('../esteira/esteira.presenter');
const { HttpError } = require('../../utils/http-error');
const { slugify } = require('../../utils/slugify');
const {
  getCampanhaBySlugParams,
  parseOrThrow,
} = require('../../validators/public-api.validators');

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
      const numerosReservados = cotas.filter((cota) => cota.status === 'reservado').map((cota) => cota.numero);
      const numerosPagos = cotas.filter((cota) => cota.status === 'pago').map((cota) => cota.numero);
      const numerosOcupados = cotas.filter((cota) => cota.status === 'reservado' || cota.status === 'pago').map((cota) => cota.numero);

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
        cotas: cotas.map((cota) => ({
          numero: cota.numero,
          label: String(cota.numero).padStart(3, '0'),
          status: cota.status,
          disponivel: cota.status === 'disponivel',
          reservado: cota.status === 'reservado',
          pago: cota.status === 'pago',
        })),
        numeros_ocupados: numerosOcupados,
        numeros_reservados: numerosReservados,
        numeros_pagos: numerosPagos,
        resumo_cotas: {
          disponiveis: cotas.filter((cota) => cota.status === 'disponivel').length,
          reservadas: numerosReservados.length,
          pagas: numerosPagos.length,
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
    const normalizedQuotaValue = parsePositiveNumber(quotaValue, 'valor_cota');
    const normalizedQuotaTotal = parsePositiveInteger(quotaTotal, 'total_cotas');
    const minCotasPorPedido = parsePositiveInteger(parsedMetadata.min_cotas_por_pedido || 1, 'min_cotas_por_pedido');
    const maxCotasPorPedido = parsePositiveInteger(parsedMetadata.max_cotas_por_pedido || normalizedQuotaTotal, 'max_cotas_por_pedido');
    const reservaExpiraMinutos = parsePositiveInteger(parsedMetadata.reserva_expira_minutos || 15, 'reserva_expira_minutos');
    const premioPrincipal = cleanString(parsedMetadata.premio_principal);
    const campaignDescription = cleanString(descricao);
    const campaignRules = cleanString(regulamento);

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

    if (!['ativo', 'pausado', 'finalizado'].includes(status || 'ativo')) {
      throw new HttpError(422, 'status invalido.');
    }

    if (minCotasPorPedido > maxCotasPorPedido) {
      throw new HttpError(422, 'min_cotas_por_pedido nao pode ser maior que max_cotas_por_pedido.');
    }

    if (maxCotasPorPedido > normalizedQuotaTotal) {
      throw new HttpError(422, 'max_cotas_por_pedido nao pode ser maior que total_cotas.');
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

    if (!ownerId || !titulo || !quotaValue || !quotaTotal) {
      throw new HttpError(422, 'usuarioClienteId, titulo, valorCota e totalCotas sao obrigatorios.');
    }

    const campaignMetadata = {
      ...parsedMetadata,
      premio_principal: premioPrincipal,
      reserva_expira_minutos: reservaExpiraMinutos,
      min_cotas_por_pedido: minCotasPorPedido,
      max_cotas_por_pedido: maxCotasPorPedido,
      whatsapp_suporte: cleanString(parsedMetadata.whatsapp_suporte),
      instrucoes_pagamento: cleanString(parsedMetadata.instrucoes_pagamento),
    };

    const campanha = await campanhasRepository.create({
      usuarioClienteId: ownerId,
      administradorId: req.admin_id,
      titulo,
      slug: await buildUniqueSlug(titulo, slug),
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
    });

    await cotasRepository.ensureCotas(campanha);

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
  create,
  update,
  remove,
};
