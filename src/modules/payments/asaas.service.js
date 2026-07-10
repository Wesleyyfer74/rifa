const prisma = require('../../database/prisma');
const { env } = require('../../config/env');
const { decryptSecret, encryptSecret } = require('../../utils/secret-crypto');
const { HttpError } = require('../../utils/http-error');

const BASE_URLS = {
  production: 'https://api.asaas.com/v3',
  sandbox: 'https://api-sandbox.asaas.com/v3',
};

function normalizeEnvironment(value) {
  return value === 'sandbox' ? 'sandbox' : 'production';
}

function getBaseUrl(environment) {
  return BASE_URLS[normalizeEnvironment(environment)];
}

function isPlatformConfigured() {
  return Boolean(env.asaasPlatformApiKey);
}

function hasDirectAccount(admin) {
  return Boolean(admin?.asaasApiKey && admin?.gatewayPreferido === 'asaas_proprio');
}

function normalizeSplitPercentual(value) {
  const fallback = Number(env.asaasDefaultSplitPercentual || 100);
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    throw new HttpError(422, 'Percentual de repasse precisa ser maior que 0 e no maximo 100.');
  }

  return Number(parsed.toFixed(2));
}

function normalizeMoney(value, label = 'Valor') {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(422, `${label} precisa ser maior que zero.`);
  }

  return Number(parsed.toFixed(2));
}

function generateEstimatedIncomeValue() {
  return Math.floor(Math.random() * 4001) + 1000;
}

function resolveIncomeValue(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Number(parsed.toFixed(2));
  }
  return generateEstimatedIncomeValue();
}

function normalizePixType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const map = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'EMAIL',
    telefone: 'PHONE',
    phone: 'PHONE',
    aleatoria: 'EVP',
    evp: 'EVP',
  };

  if (!map[normalized]) {
    throw new HttpError(422, 'Tipo de chave Pix invalido para saque.');
  }

  return map[normalized];
}

function getConnectionStatus(admin) {
  const direct = hasDirectAccount(admin);
  const split = Boolean(admin?.asaasWalletId && isPlatformConfigured());

  return {
    conectado: direct || split,
    configurado: isPlatformConfigured(),
    modo: direct ? 'conta_propria' : 'subconta_split',
    account_id: admin?.asaasAccountId || null,
    wallet_id: admin?.asaasWalletId || null,
    percentual_repasse: admin?.asaasSplitPercentual ? Number(admin.asaasSplitPercentual) : normalizeSplitPercentual(null),
    ambiente: admin?.asaasEnvironment || env.asaasPlatformEnvironment || null,
    conectado_em: admin?.asaasConnectedAt || null,
  };
}

async function requestAsaas({ apiKey, environment, path, method = 'GET', body }) {
  const response = await fetch(`${getBaseUrl(environment)}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const firstError = Array.isArray(payload.errors) ? payload.errors[0] : null;

    if (firstError?.code === 'invalid_access_token') {
      throw new HttpError(422, 'API Key Asaas invalida. Confira a chave gerada na conta do Cipriano.');
    }

    throw new HttpError(502, `Falha na API Asaas: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function cleanDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cleanString(value) {
  const cleaned = String(value || '').trim();
  return cleaned === '' ? null : cleaned;
}

function firstValue(body, keys) {
  for (const key of keys) {
    const value = cleanString(body[key]);
    if (value) return value;
  }
  return null;
}

function requireString(body, keys, label) {
  const value = firstValue(body, Array.isArray(keys) ? keys : [keys]);
  if (!value) {
    throw new HttpError(422, `${label} e obrigatorio para criar a subconta Asaas.`);
  }
  return value;
}

function parseDate(value) {
  const raw = cleanString(value);
  if (!raw) return null;

  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(422, 'Data de nascimento invalida.');
  }

  return date;
}

function hasAcceptedTerms(body) {
  return body.aceite_termos === true
    || body.aceiteTermos === true
    || body.terms_accepted === true
    || body.termsAccepted === true
    || String(body.aceite_termos || body.aceiteTermos || body.terms_accepted || body.termsAccepted || '').toLowerCase() === 'true';
}

function buildSubaccountPayload(body, admin) {
  const cpfCnpj = cleanDigits(body.cpf_cnpj || body.cpfCnpj);
  const mobilePhone = cleanDigits(body.mobile_phone || body.mobilePhone || admin?.whatsapp);
  const incomeValue = resolveIncomeValue(body.income_value || body.incomeValue);
  const postalCode = cleanDigits(body.postal_code || body.postalCode);

  if (!cpfCnpj || ![11, 14].includes(cpfCnpj.length)) {
    throw new HttpError(422, 'CPF/CNPJ invalido para criar a subconta Asaas.');
  }

  if (!mobilePhone || mobilePhone.length < 10) {
    throw new HttpError(422, 'Celular invalido para criar a subconta Asaas.');
  }

  if (!postalCode || postalCode.length !== 8) {
    throw new HttpError(422, 'CEP invalido para criar a subconta Asaas.');
  }

  if (!hasAcceptedTerms(body)) {
    throw new HttpError(422, 'Aceite os termos de uso para criar a carteira de saque.');
  }

  const payload = {
    name: requireString(body, ['name', 'nome'], 'Nome'),
    email: requireString(body, 'email', 'Email'),
    loginEmail: cleanString(body.login_email || body.loginEmail || body.email),
    cpfCnpj,
    birthDate: cleanString(body.birth_date || body.birthDate),
    companyType: cleanString(body.company_type || body.companyType),
    phone: cleanDigits(body.phone || body.telefone),
    mobilePhone,
    site: cleanString(body.site),
    incomeValue,
    address: requireString(body, ['address', 'endereco'], 'Endereco'),
    addressNumber: requireString(body, ['address_number', 'addressNumber', 'numero'], 'Numero'),
    complement: cleanString(body.complement),
    province: requireString(body, ['province', 'bairro'], 'Bairro'),
    postalCode,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
}

function buildWalletProfileData(body) {
  const email = requireString(body, 'email', 'Email').toLowerCase();
  const whatsapp = cleanDigits(body.mobile_phone || body.mobilePhone || body.whatsapp);
  const documento = cleanDigits(body.cpf_cnpj || body.cpfCnpj);
  const cep = cleanDigits(body.postal_code || body.postalCode);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(422, 'Email invalido.');
  }

  if (![11, 14].includes(documento.length)) {
    throw new HttpError(422, 'CPF/CNPJ invalido para criar a carteira de saque.');
  }

  if (whatsapp.length < 10) {
    throw new HttpError(422, 'Celular invalido para criar a carteira de saque.');
  }

  if (cep.length !== 8) {
    throw new HttpError(422, 'CEP invalido para criar a carteira de saque.');
  }

  return {
    nome: requireString(body, ['name', 'nome'], 'Nome'),
    email,
    whatsapp,
    documento,
    nascimento: parseDate(body.birth_date || body.birthDate),
    faturamentoMensal: resolveIncomeValue(body.income_value || body.incomeValue),
    cep,
    endereco: requireString(body, ['address', 'endereco'], 'Endereco'),
    enderecoNumero: requireString(body, ['address_number', 'addressNumber', 'numero'], 'Numero'),
    bairro: requireString(body, ['province', 'bairro'], 'Bairro'),
    complemento: cleanString(body.complement),
    tipoEmpresa: cleanString(body.company_type || body.companyType),
    termosUsoAceitoEm: new Date(),
  };
}

async function createSubaccount(body, admin) {
  const payload = buildSubaccountPayload(body, admin);

  return requestAsaas({
    apiKey: env.asaasPlatformApiKey,
    environment: normalizeEnvironment(env.asaasPlatformEnvironment),
    method: 'POST',
    path: '/accounts',
    body: payload,
  });
}

async function connect({ adminId, body }) {
  const enrichedBody = {
    ...body,
    income_value: resolveIncomeValue(body.income_value || body.incomeValue),
  };
  const splitPercentual = normalizeSplitPercentual(100);
  const walletProfileData = buildWalletProfileData(enrichedBody);

  if (!isPlatformConfigured()) {
    throw new HttpError(424, 'Criacao de subconta Asaas ainda nao foi configurada no servidor. Configure ASAAS_PLATFORM_API_KEY no Railway.');
  }

  const currentAdmin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  if (!currentAdmin) {
    throw new HttpError(404, 'Administrador nao encontrado.');
  }

  if (currentAdmin.asaasWalletId && currentAdmin.asaasAccountId) {
    return prisma.administrador.update({
      where: { id: adminId },
      data: {
        ...walletProfileData,
        gatewayPreferido: 'asaas',
        asaasSplitPercentual: splitPercentual,
      },
    });
  }

  const subaccount = await createSubaccount(enrichedBody, currentAdmin);

  if (!subaccount.walletId || !subaccount.apiKey) {
    throw new HttpError(502, 'Asaas nao retornou walletId/apiKey da subconta criada.');
  }

  return prisma.administrador.update({
    where: { id: adminId },
    data: {
      ...walletProfileData,
      gatewayPreferido: 'asaas',
      asaasAccountId: subaccount.id ? String(subaccount.id) : null,
      asaasWalletId: String(subaccount.walletId),
      asaasApiKey: encryptSecret(String(subaccount.apiKey)),
      asaasSplitPercentual: splitPercentual,
      asaasEnvironment: normalizeEnvironment(env.asaasPlatformEnvironment),
      asaasConnectedAt: new Date(),
    },
  });
}

async function connectOwnAccount({ adminId, apiKey, environment }) {
  const normalizedApiKey = cleanString(apiKey);
  const normalizedEnvironment = normalizeEnvironment(environment);

  if (!normalizedApiKey || normalizedApiKey.length < 20) {
    throw new HttpError(422, 'Informe a API Key da conta Asaas do Cipriano.');
  }

  await requestAsaas({
    apiKey: normalizedApiKey,
    environment: normalizedEnvironment,
    path: '/myAccount',
  });

  return prisma.administrador.update({
    where: { id: adminId },
    data: {
      gatewayPreferido: 'asaas_proprio',
      asaasApiKey: encryptSecret(normalizedApiKey),
      asaasEnvironment: normalizedEnvironment,
      asaasConnectedAt: new Date(),
      asaasAccountId: null,
      asaasWalletId: null,
      asaasSplitPercentual: null,
    },
  });
}

async function disconnect(adminId) {
  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  return prisma.administrador.update({
    where: { id: adminId },
    data: {
      asaasApiKey: null,
      asaasEnvironment: null,
      asaasConnectedAt: null,
      asaasAccountId: null,
      asaasWalletId: null,
      asaasSplitPercentual: null,
      gatewayPreferido: admin?.mercadoPagoAccessToken ? 'mercado_pago' : null,
    },
  });
}

async function getAdminCredentials(adminId) {
  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  if (!isPlatformConfigured()) {
    if (hasDirectAccount(admin)) {
      return {
        apiKey: decryptSecret(admin.asaasApiKey),
        environment: normalizeEnvironment(admin.asaasEnvironment),
      };
    }

    throw new HttpError(424, 'Asaas split ainda nao foi configurado no servidor.');
  }

  if (hasDirectAccount(admin)) {
    return {
      apiKey: decryptSecret(admin.asaasApiKey),
      environment: normalizeEnvironment(admin.asaasEnvironment),
    };
  }

  if (!admin?.asaasWalletId) {
    throw new HttpError(409, 'Ative a carteira Asaas do dono da rifa antes de vender.');
  }

  return {
    apiKey: env.asaasPlatformApiKey,
    environment: normalizeEnvironment(env.asaasPlatformEnvironment),
    split: {
      walletId: admin.asaasWalletId,
      percentualValue: normalizeSplitPercentual(admin.asaasSplitPercentual),
    },
  };
}

async function getAdminFinancialCredentials(adminId) {
  const admin = await prisma.administrador.findUnique({
    where: { id: adminId },
  });

  if (!admin?.asaasApiKey) {
    throw new HttpError(409, 'Crie a subconta Asaas antes de consultar saldo ou solicitar saque.');
  }

  return {
    admin,
    apiKey: decryptSecret(admin.asaasApiKey),
    environment: normalizeEnvironment(admin.asaasEnvironment || env.asaasPlatformEnvironment),
  };
}

async function getBalance(adminId) {
  const credentials = await getAdminFinancialCredentials(adminId);
  const balance = await requestAsaas({
    apiKey: credentials.apiKey,
    environment: credentials.environment,
    path: '/finance/balance',
  });

  return {
    ...balance,
    ambiente: credentials.environment,
    subconta_ativa: Boolean(credentials.admin.asaasWalletId || hasDirectAccount(credentials.admin)),
  };
}

async function createPixWithdrawal({ adminId, value, pixKey, pixKeyType, description }) {
  const credentials = await getAdminFinancialCredentials(adminId);
  const transferValue = normalizeMoney(value, 'Valor do saque');
  const normalizedPixKey = cleanString(pixKey || credentials.admin.pixChave);
  const normalizedPixType = normalizePixType(pixKeyType || credentials.admin.pixTipo);

  if (!normalizedPixKey) {
    throw new HttpError(422, 'Informe a chave Pix para saque no perfil.');
  }

  const transfer = await requestAsaas({
    apiKey: credentials.apiKey,
    environment: credentials.environment,
    method: 'POST',
    path: '/transfers',
    body: {
      value: transferValue,
      pixAddressKey: normalizedPixKey,
      pixAddressKeyType: normalizedPixType,
      description: cleanString(description) || 'Saque solicitado no painel de rifas',
    },
  });

  const saque = await prisma.saque.create({
    data: {
      administradorId: adminId,
      valor: transferValue,
      pixChave: normalizedPixKey,
      pixTipo: normalizedPixType,
      status: transfer.status ? String(transfer.status).toLowerCase() : 'pendente',
      asaasTransferId: transfer.id ? String(transfer.id) : null,
      payload: transfer,
    },
  });

  return {
    saque,
    transfer,
  };
}

module.exports = {
  connect,
  connectOwnAccount,
  createSubaccount,
  createPixWithdrawal,
  disconnect,
  getBalance,
  getAdminCredentials,
  getConnectionStatus,
  hasDirectAccount,
  isPlatformConfigured,
  requestAsaas,
};
