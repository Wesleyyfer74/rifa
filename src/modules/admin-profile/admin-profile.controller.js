const prisma = require('../../database/prisma');
const profileRepository = require('./admin-profile.repository');
const asaasService = require('../payments/asaas.service');
const mercadoPagoOAuth = require('../payments/mercado-pago-oauth.service');
const { HttpError } = require('../../utils/http-error');

function cleanString(value) {
  const cleaned = String(value || '').trim();
  return cleaned === '' ? null : cleaned;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function serializeProfile(admin) {
  return {
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    whatsapp: admin.whatsapp,
    pix_chave: admin.pixChave,
    pix_tipo: admin.pixTipo,
    telefone_mensagens: admin.telefoneMensagens,
    gateway_preferido: admin.gatewayPreferido,
    carteira: {
      documento: admin.documento,
      nascimento: admin.nascimento,
      faturamento_mensal: admin.faturamentoMensal,
      cep: admin.cep,
      endereco: admin.endereco,
      endereco_numero: admin.enderecoNumero,
      bairro: admin.bairro,
      complemento: admin.complemento,
      tipo_empresa: admin.tipoEmpresa,
      termos_uso_aceito_em: admin.termosUsoAceitoEm,
    },
    mercado_pago: mercadoPagoOAuth.getConnectionStatus(admin),
    asaas: asaasService.getConnectionStatus(admin),
  };
}

function validateProfileInput(body) {
  const nome = cleanString(body.nome);
  const email = normalizeEmail(body.email);
  const whatsapp = cleanString(body.whatsapp);
  const pixChave = cleanString(body.pix_chave || body.pixChave);
  const pixTipo = cleanString(body.pix_tipo || body.pixTipo);
  const telefoneMensagens = cleanString(body.telefone_mensagens || body.telefoneMensagens);

  if (!nome || nome.length < 2 || nome.length > 160) {
    throw new HttpError(422, 'Nome do dono precisa ter entre 2 e 160 caracteres.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(422, 'Email invalido.');
  }

  if (whatsapp && !/^[0-9+()\-\s]{8,30}$/.test(whatsapp)) {
    throw new HttpError(422, 'WhatsApp invalido.');
  }

  if (telefoneMensagens && !/^[0-9+()\-\s]{8,30}$/.test(telefoneMensagens)) {
    throw new HttpError(422, 'Telefone para mensagens invalido.');
  }

  if (pixTipo && !['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'].includes(pixTipo)) {
    throw new HttpError(422, 'Tipo de chave Pix invalido.');
  }

  if (pixChave && pixChave.length > 180) {
    throw new HttpError(422, 'Chave Pix muito longa.');
  }

  return {
    nome,
    email,
    whatsapp,
    pixChave,
    pixTipo,
    telefoneMensagens,
  };
}

async function show(req, res, next) {
  try {
    const admin = await profileRepository.findById(req.admin_id);

    if (!admin) {
      throw new HttpError(404, 'Administrador nao encontrado.');
    }

    return res.json({ data: serializeProfile(admin) });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = validateProfileInput(req.body);

    const existingEmailOwner = await profileRepository.findByEmail(data.email);
    if (existingEmailOwner && existingEmailOwner.id !== req.admin_id) {
      throw new HttpError(409, 'Este email ja esta em uso por outro administrador.');
    }

    const admin = await prisma.$transaction(async (tx) => {
      const updated = await profileRepository.updateById(req.admin_id, data, tx);
      await profileRepository.syncOwnerMirror(updated, tx);
      return updated;
    });

    return res.json({ data: serializeProfile(admin) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  show,
  update,
};
