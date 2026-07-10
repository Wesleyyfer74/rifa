let campaigns = [];
let rifinhas = [];

const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
const screens = document.querySelectorAll('.panel-screen');
const campaignGrid = document.querySelector('#campaignGrid');
const rifinhasList = document.querySelector('#rifinhasList');
const ordersCampaignList = document.querySelector('#ordersCampaignList');
const ordersList = document.querySelector('#ordersList');
const refreshOrdersButton = document.querySelector('#refreshOrders');
const searchInput = document.querySelector('#campaignSearch');
const template = document.querySelector('#campaignCardTemplate');
const campaignModal = document.querySelector('#campaignModal');
const campaignForm = document.querySelector('#campaignForm');
const campaignModalEyebrow = document.querySelector('#campaignModalEyebrow');
const campaignModalTitle = document.querySelector('#campaignModalTitle');
const campaignSubmitButton = document.querySelector('#campaignSubmitButton');
const campaignType = document.querySelector('#campaignType');
const campaignTypeHelp = document.querySelector('#campaignTypeHelp');
const campaignQuotaValue = document.querySelector('#campaignQuotaValue');
const campaignQuotaValueHelp = document.querySelector('#campaignQuotaValueHelp');
const campaignMinQuota = document.querySelector('[name="min_cotas_por_pedido"]');
const campaignMaxQuota = document.querySelector('[name="max_cotas_por_pedido"]');
const statActiveCampaigns = document.querySelector('#statActiveCampaigns');
const statOrdersToday = document.querySelector('#statOrdersToday');
const statPendingRevenue = document.querySelector('#statPendingRevenue');
const statSoldQuotas = document.querySelector('#statSoldQuotas');
const adminInitials = document.querySelector('#adminInitials');
const adminName = document.querySelector('#adminName');
const headerBalanceValue = document.querySelector('#headerBalanceValue');
const profileButton = document.querySelector('#profileButton');
const headerLogoutButton = document.querySelector('#headerLogoutButton');
const profileForm = document.querySelector('#profileForm');
const profileFeedback = document.querySelector('#profileFeedback');
const logoutButton = document.querySelector('#logoutButton');
const mercadoPagoStatus = document.querySelector('#mercadoPagoStatus');
const connectMercadoPagoButton = document.querySelector('#connectMercadoPagoButton');
const disconnectMercadoPagoButton = document.querySelector('#disconnectMercadoPagoButton');
const asaasStatus = document.querySelector('#asaasStatus');
const asaasCpfCnpj = document.querySelector('#asaasCpfCnpj');
const asaasBirthDate = document.querySelector('#asaasBirthDate');
const asaasIncomeValue = document.querySelector('#asaasIncomeValue');
const asaasPostalCode = document.querySelector('#asaasPostalCode');
const asaasAddress = document.querySelector('#asaasAddress');
const asaasAddressNumber = document.querySelector('#asaasAddressNumber');
const asaasProvince = document.querySelector('#asaasProvince');
const asaasCompanyType = document.querySelector('#asaasCompanyType');
const connectAsaasButton = document.querySelector('#connectAsaasButton');
const disconnectAsaasButton = document.querySelector('#disconnectAsaasButton');
const asaasBalanceValue = document.querySelector('#asaasBalanceValue');
const asaasBalanceStatus = document.querySelector('#asaasBalanceStatus');
const refreshAsaasBalanceButton = document.querySelector('#refreshAsaasBalanceButton');
const asaasWithdrawValue = document.querySelector('#asaasWithdrawValue');
const asaasWithdrawPixType = document.querySelector('#asaasWithdrawPixType');
const asaasWithdrawPixKey = document.querySelector('#asaasWithdrawPixKey');
const requestAsaasWithdrawalButton = document.querySelector('#requestAsaasWithdrawalButton');
const buyersCampaignSelect = document.querySelector('#buyersCampaignSelect');
const buyersRealtimeList = document.querySelector('#buyersRealtimeList');
const buyersRankingList = document.querySelector('#buyersRankingList');
const historyCampaignsList = document.querySelector('#historyCampaignsList');
const historyClientsList = document.querySelector('#historyClientsList');
const disclosureModal = document.querySelector('#disclosureModal');
const disclosureTitle = document.querySelector('#disclosureTitle');
const disclosureBody = document.querySelector('#disclosureBody');
const closeDisclosureModalButton = document.querySelector('#closeDisclosureModal');
const cancelDisclosureModalButton = document.querySelector('#cancelDisclosureModal');
const confirmDisclosureButton = document.querySelector('#confirmDisclosureButton');
const confirmActionModal = document.querySelector('#confirmActionModal');
const confirmActionEyebrow = document.querySelector('#confirmActionEyebrow');
const confirmActionTitle = document.querySelector('#confirmActionTitle');
const confirmActionMessage = document.querySelector('#confirmActionMessage');
const confirmActionWarning = document.querySelector('#confirmActionWarning');
const confirmActionButton = document.querySelector('#confirmActionButton');
const closeConfirmActionModalButton = document.querySelector('#closeConfirmActionModal');
const cancelConfirmActionButton = document.querySelector('#cancelConfirmAction');

let selectedDisclosureCampaign = null;
let selectedDisclosureStatus = null;
let pendingConfirmAction = null;
let gatewayConnected = false;
let editingCampaignId = null;

function isFreeCampaignForm() {
  return campaignType?.value === 'gratuita';
}

function getAdminToken() {
  return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
}

function getStoredAdmin() {
  try {
    return JSON.parse(localStorage.getItem('admin_user') || 'null');
  } catch (error) {
    return null;
  }
}

function authHeaders() {
  const token = getAdminToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function renderAdminProfile() {
  const admin = getStoredAdmin();
  const name = admin?.nome || 'Administrador';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AD';

  adminName.textContent = name;
  adminInitials.textContent = initials;
}

function showProfileFeedback(message, type = 'success') {
  profileFeedback.textContent = message;
  profileFeedback.classList.remove('hidden', 'border-red-500/30', 'bg-red-500/10', 'text-red-300', 'border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300');

  if (type === 'error') {
    profileFeedback.classList.add('border-red-500/30', 'bg-red-500/10', 'text-red-300');
    return;
  }

  profileFeedback.classList.add('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300');
}

function hideProfileFeedback() {
  profileFeedback.classList.add('hidden');
  profileFeedback.textContent = '';
}

function fillProfileForm(profile) {
  gatewayConnected = false;
  profileForm.elements.nome.value = profile?.nome || '';
  profileForm.elements.email.value = profile?.email || '';
  profileForm.elements.whatsapp.value = profile?.whatsapp || '';
  profileForm.elements.telefone_mensagens.value = profile?.telefone_mensagens || '';
  profileForm.elements.pix_tipo.value = profile?.pix_tipo || '';
  profileForm.elements.pix_chave.value = profile?.pix_chave || '';
  renderMercadoPagoStatus(profile?.mercado_pago);
  renderAsaasStatus(profile?.asaas);
  updateCampaignCreateAvailability();
}

function updateCampaignCreateAvailability() {
  const openButton = document.querySelector('#openCampaignModal');
  if (!openButton) return;

  openButton.classList.toggle('opacity-60', !gatewayConnected);
  openButton.title = gatewayConnected
    ? 'Criar rifa'
    : 'Rifas pagas exigem recebimento ativo. Sorteios gratuitos podem ser criados sem Pix.';
}

function updateCampaignTypeUi() {
  const free = isFreeCampaignForm();

  if (campaignQuotaValue) {
    campaignQuotaValue.readOnly = free;
    if (free) {
      campaignQuotaValue.value = '0';
    } else if (Number(campaignQuotaValue.value || 0) === 0) {
      campaignQuotaValue.value = '';
    }
  }

  if (campaignQuotaValueHelp) {
    campaignQuotaValueHelp.textContent = free
      ? 'Sorteio gratuito: o comprador nao paga para adquirir uma cota.'
      : 'Preco unitario pago pelo comprador.';
  }

  [campaignMinQuota, campaignMaxQuota].forEach((input) => {
    if (!input) return;
    input.readOnly = free;
    if (free) {
      input.value = '1';
    }
  });

  if (campaignTypeHelp) {
    campaignTypeHelp.textContent = free
      ? 'Campanha sem fins lucrativos. Nao gera Pix e confirma a cota automaticamente.'
      : 'Rifas pagas exigem carteira de recebimento ativa para gerar Pix.';
  }
}

function setPaymentButtonLabel(button, mark, label) {
  if (!button) return;
  button.innerHTML = `<span class="payment-button-mark">${mark}</span>${label}`;
}

function renderMercadoPagoStatus(status) {
  if (!mercadoPagoStatus || !connectMercadoPagoButton || !disconnectMercadoPagoButton) return;

  const connected = Boolean(status?.conectado);
  const configured = status?.configurado !== false;
  gatewayConnected = gatewayConnected || connected;

  mercadoPagoStatus.classList.remove('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300', 'border-amber-500/30', 'bg-amber-500/10', 'text-amber-200', 'border-panel-line', 'bg-black/30', 'text-panel-muted');

  if (connected) {
    mercadoPagoStatus.classList.add('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300');
    mercadoPagoStatus.textContent = 'Mercado Pago conectado. As vendas ja podem gerar Pix nessa conta.';
    setPaymentButtonLabel(connectMercadoPagoButton, 'MP', 'Trocar conta Mercado Pago');
    connectMercadoPagoButton.disabled = false;
    disconnectMercadoPagoButton.classList.remove('hidden');
    return;
  }

  if (!configured) {
    mercadoPagoStatus.classList.add('border-amber-500/30', 'bg-amber-500/10', 'text-amber-200');
    mercadoPagoStatus.textContent = 'Opcao ainda nao liberada. O suporte precisa ativar a conexao Mercado Pago antes de voce usar.';
    setPaymentButtonLabel(connectMercadoPagoButton, 'MP', 'Aguardando suporte');
    connectMercadoPagoButton.disabled = true;
    disconnectMercadoPagoButton.classList.add('hidden');
    return;
  }

  mercadoPagoStatus.classList.add('border-panel-line', 'bg-black/30', 'text-panel-muted');
  mercadoPagoStatus.textContent = 'Ainda nao conectado. Conecte para liberar a criacao de rifas e receber Pix automaticamente.';
  setPaymentButtonLabel(connectMercadoPagoButton, 'MP', 'Conectar minha conta');
  connectMercadoPagoButton.disabled = false;
  disconnectMercadoPagoButton.classList.add('hidden');
}

function renderAsaasStatus(status) {
  if (!asaasStatus || !connectAsaasButton || !disconnectAsaasButton) {
    gatewayConnected = gatewayConnected || Boolean(status?.conectado);
    return;
  }

  const connected = Boolean(status?.conectado);
  gatewayConnected = gatewayConnected || connected;

  asaasStatus.classList.remove('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300', 'border-amber-500/30', 'bg-amber-500/10', 'text-amber-200', 'border-panel-line', 'bg-black/30', 'text-panel-muted');

  if (connected) {
    asaasStatus.classList.add('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300');
    asaasStatus.textContent = status.modo === 'conta_propria'
      ? 'Recebimento ativo. Os Pix vao cair direto na sua carteira.'
      : 'Recebimento ativo. Voce ja pode criar rifas, acompanhar saldo e solicitar saques.';
    setPaymentButtonLabel(connectAsaasButton, 'A', status.modo === 'conta_propria' ? 'Atualizar recebimento' : 'Atualizar cadastro');
    disconnectAsaasButton.classList.remove('hidden');
    fetchAsaasBalance();
    return;
  }

  asaasStatus.classList.add('border-panel-line', 'bg-black/30', 'text-panel-muted');
  asaasStatus.textContent = 'Preencha o cadastro obrigatorio para ativar seu recebimento.';
  setPaymentButtonLabel(connectAsaasButton, 'A', 'Ativar recebimento');
  connectAsaasButton.disabled = false;
  disconnectAsaasButton.classList.add('hidden');
}

async function fetchAdminProfile() {
  if (!getAdminToken()) {
    fillProfileForm({});
    return null;
  }

  hideProfileFeedback();

  try {
    const response = await fetch('/api/v1/admin/perfil', {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel carregar o perfil.');
    }

    localStorage.setItem('admin_user', JSON.stringify(payload.data));
    fillProfileForm(payload.data);
    renderAdminProfile();
    return payload.data;
  } catch (error) {
    showProfileFeedback(error.message, 'error');
    return null;
  }
}

async function fetchMercadoPagoStatus() {
  if (!getAdminToken() || !mercadoPagoStatus) return;

  try {
    const response = await fetch('/api/v1/admin/gateways/mercado-pago/status', {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 424) {
        renderMercadoPagoStatus({ conectado: false, configurado: false });
        updateCampaignCreateAvailability();
        return;
      }

      throw new Error(payload.error?.message || 'Nao foi possivel verificar Mercado Pago.');
    }

    renderMercadoPagoStatus(payload.data);
    updateCampaignCreateAvailability();
  } catch (error) {
    renderMercadoPagoStatus({ conectado: false });
    updateCampaignCreateAvailability();
  }
}

async function fetchAsaasStatus() {
  if (!getAdminToken()) return;

  try {
    const response = await fetch('/api/v1/admin/gateways/asaas/status', {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel verificar Asaas.');
    }

    renderAsaasStatus(payload.data);
    updateCampaignCreateAvailability();
  } catch (error) {
    renderAsaasStatus({ conectado: false });
    updateCampaignCreateAvailability();
  }
}

async function connectMercadoPago() {
  if (!connectMercadoPagoButton) return;

  if (!getAdminToken()) {
    window.location.href = '/login';
    return;
  }

  let missingServerConfig = false;

  try {
    connectMercadoPagoButton.disabled = true;
    setPaymentButtonLabel(connectMercadoPagoButton, 'MP', 'Abrindo autorizacao...');

    const response = await fetch('/api/v1/admin/gateways/mercado-pago/connect', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Accept: 'application/json',
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      missingServerConfig = response.status === 424;
      throw new Error(payload.error?.message || 'Nao foi possivel iniciar conexao Mercado Pago.');
    }

    window.location.href = payload.data.authorization_url;
  } catch (error) {
    showProfileFeedback(error.message, 'error');
    if (missingServerConfig) {
      renderMercadoPagoStatus({ conectado: false, configurado: false });
    } else {
      connectMercadoPagoButton.disabled = false;
      setPaymentButtonLabel(connectMercadoPagoButton, 'MP', 'Conectar minha conta');
    }
  }
}

async function disconnectMercadoPago() {
  if (!disconnectMercadoPagoButton) return;

  if (!window.confirm('Desconectar Mercado Pago? Novas vendas nao vao gerar Pix por essa conta ate conectar novamente.')) {
    return;
  }

  try {
    const response = await fetch('/api/v1/admin/gateways/mercado-pago', {
      method: 'DELETE',
      headers: {
        ...authHeaders(),
        Accept: 'application/json',
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel desconectar Mercado Pago.');
    }

    renderMercadoPagoStatus(payload.data);
    await fetchAdminProfile();
    showProfileFeedback('Mercado Pago desconectado. Conecte uma conta antes de criar novas rifas.');
  } catch (error) {
    showProfileFeedback(error.message, 'error');
  }
}

async function connectAsaas() {
  if (!connectAsaasButton) return;

  if (!getAdminToken()) {
    window.location.href = '/login';
    return;
  }

  try {
    connectAsaasButton.disabled = true;
    setPaymentButtonLabel(connectAsaasButton, 'A', 'Ativando recebimento...');

    const profileData = new FormData(profileForm);

    const response = await fetch('/api/v1/admin/gateways/asaas/connect', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: profileData.get('nome'),
        email: profileData.get('email'),
        mobile_phone: profileData.get('whatsapp') || profileData.get('telefone_mensagens'),
        cpf_cnpj: asaasCpfCnpj.value,
        birth_date: asaasBirthDate.value,
        income_value: asaasIncomeValue.value,
        postal_code: asaasPostalCode.value,
        address: asaasAddress.value,
        address_number: asaasAddressNumber.value,
        province: asaasProvince.value,
        company_type: asaasCompanyType.value,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel conectar Asaas.');
    }

    renderAsaasStatus(payload.data);
    gatewayConnected = true;
    updateCampaignCreateAvailability();
    showProfileFeedback('Recebimento ativado com sucesso.');
  } catch (error) {
    showProfileFeedback(error.message, 'error');
  } finally {
    connectAsaasButton.disabled = false;
  }
}

async function disconnectAsaas() {
  if (!disconnectAsaasButton) return;

  if (!window.confirm('Desativar recebimento? Novas vendas e saques ficarao bloqueados ate ativar novamente.')) {
    return;
  }

  try {
    const response = await fetch('/api/v1/admin/gateways/asaas', {
      method: 'DELETE',
      headers: {
        ...authHeaders(),
        Accept: 'application/json',
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel desconectar Asaas.');
    }

    renderAsaasStatus(payload.data);
    await fetchAdminProfile();
    showProfileFeedback('Recebimento desativado. Ative novamente antes de criar novas rifas.');
  } catch (error) {
    showProfileFeedback(error.message, 'error');
  }
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

async function fetchAsaasBalance() {
  if (!getAdminToken()) return;

  try {
    if (asaasBalanceStatus) asaasBalanceStatus.textContent = 'Consultando saldo...';
    const response = await fetch('/api/v1/admin/gateways/asaas/saldo', {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel consultar saldo.');
    }

    const balance = payload.data?.balance ?? payload.data?.availableBalance ?? payload.data?.value ?? 0;
    const formattedBalance = formatBRL(balance);
    if (asaasBalanceValue) asaasBalanceValue.textContent = formattedBalance;
    if (headerBalanceValue) headerBalanceValue.textContent = formattedBalance;
    if (asaasBalanceStatus) asaasBalanceStatus.textContent = 'Saldo disponivel para saque.';
  } catch (error) {
    if (asaasBalanceStatus) asaasBalanceStatus.textContent = error.message;
    if (headerBalanceValue) headerBalanceValue.textContent = 'R$ 0,00';
  }
}

async function requestAsaasWithdrawal() {
  if (!getAdminToken()) {
    window.location.href = '/login';
    return;
  }

  const pixChave = asaasWithdrawPixKey.value;
  const pixTipo = asaasWithdrawPixType.value;
  const valor = Number(asaasWithdrawValue.value || 0);

  if (!pixTipo || !pixChave) {
    showProfileFeedback('Informe o tipo da chave Pix e a chave Pix para este saque.', 'error');
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    showProfileFeedback('Informe um valor de saque valido.', 'error');
    return;
  }

  if (!window.confirm(`Confirmar saque de ${formatBRL(valor)} para a chave Pix informada?`)) {
    return;
  }

  try {
    requestAsaasWithdrawalButton.disabled = true;
    requestAsaasWithdrawalButton.textContent = 'Solicitando saque...';

    const response = await fetch('/api/v1/admin/gateways/asaas/saques', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valor,
        pix_tipo: pixTipo,
        pix_chave: pixChave,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel solicitar saque.');
    }

    asaasWithdrawValue.value = '';
    asaasWithdrawPixType.value = '';
    asaasWithdrawPixKey.value = '';
    showProfileFeedback('Saque solicitado com sucesso.');
    fetchAsaasBalance();
  } catch (error) {
    showProfileFeedback(error.message, 'error');
  } finally {
    requestAsaasWithdrawalButton.disabled = false;
    requestAsaasWithdrawalButton.textContent = 'Solicitar saque';
  }
}

function handleGatewayReturnMessage() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('gateway') !== 'mercado_pago') return;

  setActiveTab('perfil');

  if (params.get('status') === 'connected') {
    showProfileFeedback('Mercado Pago conectado com sucesso.');
    fetchMercadoPagoStatus();
  } else if (params.get('status') === 'error') {
    showProfileFeedback(params.get('message') || 'Nao foi possivel conectar Mercado Pago.', 'error');
  }

  window.history.replaceState({}, document.title, '/painel');
}

function clearSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('token');
  localStorage.removeItem('admin_user');
  window.location.href = '/login';
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function statusClasses(status) {
  if (status === 'Ativo') {
    return 'bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/35';
  }

  return 'bg-white/5 text-panel-muted ring-1 ring-white/10';
}

function paymentStatusClasses(status) {
  if (status === 'pago') return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
  if (status === 'expirado') return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
  return 'bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/35';
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatCompactNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    notation: Number(value || 0) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  });
}

function renderDashboardStats(stats = {}) {
  if (!statActiveCampaigns) return;

  statActiveCampaigns.textContent = Number(stats.campanhas_ativas || 0).toLocaleString('pt-BR');
  statOrdersToday.textContent = Number(stats.pedidos_hoje || 0).toLocaleString('pt-BR');
  statPendingRevenue.textContent = stats.receita_pendente_formatada || formatMoney(stats.receita_pendente || 0);
  statSoldQuotas.textContent = stats.cotas_vendidas_formatada || formatCompactNumber(stats.cotas_vendidas || 0);
}

async function fetchDashboardStats() {
  if (!getAdminToken()) {
    renderDashboardStats();
    return;
  }

  try {
    const response = await fetch('/api/v1/admin/dashboard/stats', {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error('Falha ao buscar indicadores');
    const payload = await response.json();
    renderDashboardStats(payload.data || {});
  } catch (error) {
    renderDashboardStats();
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function mapApiCampaign(campaign) {
  const pedidos = Array.isArray(campaign.pedidos) ? campaign.pedidos : [];
  const paidOrders = pedidos.filter((pedido) => pedido.statusPagamento === 'pago');
  const sold = paidOrders.reduce((total, pedido) => {
    const cotas = Array.isArray(pedido.cotasReservadas) ? pedido.cotasReservadas : [];
    return total + cotas.length;
  }, 0);
  const revenue = paidOrders.reduce((total, pedido) => total + Number(pedido.valorTotal || 0), 0);

  return {
    id: campaign.id,
    title: campaign.titulo,
    slug: campaign.slug,
    publicUrl: `/rifa/${campaign.slug}`,
    status: campaign.status === 'ativo' ? 'Ativo' : 'Pausado',
    rawStatus: campaign.status,
    description: campaign.descricao || '',
    rules: campaign.regulamento || '',
    metadata: campaign.metadata && typeof campaign.metadata === 'object' ? campaign.metadata : {},
    drawDate: campaign.dataSorteio || campaign.data_sorteio || '',
    quotaValue: Number(campaign.valorCota ?? campaign.valor_cota ?? 0),
    totalQuotas: Number(campaign.totalCotas ?? campaign.total_cotas ?? 0),
    imageUrl: campaign.imagemUrl || campaign.imagem_url || '',
    image: campaign.imagemUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80',
    cotas: campaign.totalCotas || 0,
    price: formatMoney(campaign.valorCota),
    sold: sold.toLocaleString('pt-BR'),
    orders: pedidos.length,
    revenue: formatMoney(revenue),
  };
}

function emptyList(message) {
  return `
    <div class="p-8 text-center">
      <p class="text-sm font-extrabold text-panel-muted">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderBuyerCampaignOptions() {
  if (!buyersCampaignSelect) return;

  const selectedCampaignId = buyersCampaignSelect.value;
  buyersCampaignSelect.innerHTML = '<option value="">Selecione uma campanha</option>';

  campaigns.forEach((campaign) => {
    const option = document.createElement('option');
    option.value = campaign.id;
    option.textContent = campaign.title;
    buyersCampaignSelect.appendChild(option);
  });

  if (campaigns.some((campaign) => campaign.id === selectedCampaignId)) {
    buyersCampaignSelect.value = selectedCampaignId;
    return;
  }

  if (campaigns.length) {
    buyersCampaignSelect.value = campaigns[0].id;
  }
}

function renderBuyerStats(data = {}) {
  const realtime = data.tempo_real || [];
  const ranking = data.ranking_baleias || [];

  buyersRealtimeList.innerHTML = realtime.length ? realtime.map((pedido) => `
    <article class="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-3">
          <h3 class="truncate text-base font-extrabold text-gold-50">${escapeHtml(pedido.nome || 'Comprador')}</h3>
          <span class="rounded-full px-3 py-1 text-xs font-extrabold uppercase ${paymentStatusClasses(pedido.status)}">${escapeHtml(pedido.status || 'pendente')}</span>
        </div>
        <p class="mt-1 text-sm font-semibold text-panel-muted">${escapeHtml(pedido.whatsapp || '-')}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 text-right">
        <div class="rounded-2xl bg-black/35 p-3 ring-1 ring-panel-line">
          <span class="block text-xs font-bold text-panel-muted">Cotas</span>
          <strong class="mt-1 block text-sm font-extrabold text-gold-100">${Number(pedido.quantidade_cotas || 0).toLocaleString('pt-BR')}</strong>
        </div>
        <div class="rounded-2xl bg-black/35 p-3 ring-1 ring-panel-line">
          <span class="block text-xs font-bold text-panel-muted">Chance</span>
          <strong class="mt-1 block text-sm font-extrabold text-gold-100">${escapeHtml(pedido.porcentagem_adquirida_formatada || '0.00%')}</strong>
        </div>
      </div>
    </article>
  `).join('') : emptyList('Nenhum pedido pago ou pendente nesta campanha.');

  buyersRankingList.innerHTML = ranking.length ? ranking.map((comprador) => `
    <article class="flex items-center justify-between gap-4 p-5">
      <div class="flex min-w-0 items-center gap-4">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-500 text-sm font-extrabold text-black">${Number(comprador.posicao || 0)}</div>
        <div class="min-w-0">
          <h3 class="truncate text-sm font-extrabold text-gold-50">${escapeHtml(comprador.nome || 'Comprador')}</h3>
          <p class="mt-1 truncate text-xs font-semibold text-panel-muted">${escapeHtml(comprador.whatsapp || '-')}</p>
        </div>
      </div>
      <div class="text-right">
        <strong class="block text-sm font-extrabold text-gold-100">${Number(comprador.total_cotas_pagas || 0).toLocaleString('pt-BR')} cotas</strong>
        <span class="text-xs font-bold text-panel-muted">${escapeHtml(comprador.porcentagem_total_formatada || '0.00%')}</span>
      </div>
    </article>
  `).join('') : emptyList('Nenhum comprador pago nesta campanha.');
}

async function fetchCompradoresStats() {
  if (!buyersCampaignSelect || !buyersRealtimeList || !buyersRankingList) return;

  if (!campaigns.length) {
    renderBuyerCampaignOptions();
    buyersRealtimeList.innerHTML = emptyList('Crie uma campanha para acompanhar compradores.');
    buyersRankingList.innerHTML = emptyList('Ranking indisponivel sem campanhas.');
    return;
  }

  renderBuyerCampaignOptions();
  const campaignId = buyersCampaignSelect.value;

  if (!campaignId) {
    buyersRealtimeList.innerHTML = emptyList('Selecione uma campanha.');
    buyersRankingList.innerHTML = emptyList('Selecione uma campanha.');
    return;
  }

  buyersRealtimeList.innerHTML = emptyList('Carregando compradores...');
  buyersRankingList.innerHTML = emptyList('Carregando ranking...');

  try {
    const response = await fetch(`/api/v1/admin/campanhas/${campaignId}/compradores-stats`, {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel carregar compradores.');
    }

    renderBuyerStats(payload.data || {});
  } catch (error) {
    buyersRealtimeList.innerHTML = `
      <div class="p-8 text-center">
        <p class="text-sm font-extrabold text-red-300">${escapeHtml(error.message)}</p>
      </div>
    `;
    buyersRankingList.innerHTML = emptyList('Ranking indisponivel.');
  }
}

function renderHistorico(data = {}) {
  const campanhasAntigas = data.campanhas_antigas || [];
  const clientesAntigos = data.clientes_antigos || [];

  historyCampaignsList.innerHTML = campanhasAntigas.length ? campanhasAntigas.map((campanha) => `
    <article class="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-3">
          <h3 class="truncate text-base font-extrabold text-gold-50">${escapeHtml(campanha.titulo || 'Campanha')}</h3>
          <span class="rounded-full bg-white/5 px-3 py-1 text-xs font-extrabold uppercase text-panel-muted ring-1 ring-white/10">${escapeHtml(campanha.status || 'finalizado')}</span>
        </div>
        <p class="mt-1 text-sm font-semibold text-panel-muted">/${escapeHtml(campanha.slug || '')}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 text-right">
        <div class="rounded-2xl bg-black/35 p-3 ring-1 ring-panel-line">
          <span class="block text-xs font-bold text-panel-muted">Receita</span>
          <strong class="mt-1 block text-sm font-extrabold text-gold-100">${escapeHtml(campanha.receita_total_formatada || formatMoney(campanha.receita_total))}</strong>
        </div>
        <div class="rounded-2xl bg-black/35 p-3 ring-1 ring-panel-line">
          <span class="block text-xs font-bold text-panel-muted">Cotas</span>
          <strong class="mt-1 block text-sm font-extrabold text-gold-100">${Number(campanha.cotas_vendidas || 0).toLocaleString('pt-BR')}</strong>
        </div>
      </div>
    </article>
  `).join('') : emptyList('Nenhuma campanha finalizada ainda.');

  historyClientsList.innerHTML = clientesAntigos.length ? clientesAntigos.map((cliente) => `
    <article class="flex items-center justify-between gap-4 p-5">
      <div class="min-w-0">
        <h3 class="truncate text-sm font-extrabold text-gold-50">${escapeHtml(cliente.nome || 'Comprador')}</h3>
        <p class="mt-1 truncate text-xs font-semibold text-panel-muted">${escapeHtml(cliente.whatsapp || '-')}</p>
      </div>
      <div class="text-right">
        <strong class="block text-sm font-extrabold text-gold-100">${escapeHtml(cliente.total_gasto_sistema_formatado || formatMoney(cliente.total_gasto_sistema))}</strong>
        <span class="text-xs font-bold text-panel-muted">${Number(cliente.quantidade_campanhas_participou || 0).toLocaleString('pt-BR')} campanha(s)</span>
      </div>
    </article>
  `).join('') : emptyList('Nenhum cliente antigo encontrado.');
}

async function fetchHistorico() {
  if (!historyCampaignsList || !historyClientsList) return;

  historyCampaignsList.innerHTML = emptyList('Carregando historico...');
  historyClientsList.innerHTML = emptyList('Carregando clientes...');

  try {
    const response = await fetch('/api/v1/admin/historico', {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel carregar historico.');
    }

    renderHistorico(payload.data || {});
  } catch (error) {
    historyCampaignsList.innerHTML = `
      <div class="p-8 text-center">
        <p class="text-sm font-extrabold text-red-300">${escapeHtml(error.message)}</p>
      </div>
    `;
    historyClientsList.innerHTML = emptyList('Historico indisponivel.');
  }
}

function openDisclosureModal() {
  disclosureModal.classList.remove('hidden');
  disclosureModal.classList.add('flex');
}

function closeDisclosureModal() {
  disclosureModal.classList.add('hidden');
  disclosureModal.classList.remove('flex');
  selectedDisclosureCampaign = null;
  selectedDisclosureStatus = null;
  confirmDisclosureButton.disabled = false;
  confirmDisclosureButton.textContent = 'Disparar Nova Campanha via WhatsApp';
}

function openConfirmActionModal(config) {
  pendingConfirmAction = config;
  confirmActionEyebrow.textContent = config.eyebrow || 'Confirmacao';
  confirmActionTitle.textContent = config.title || 'Tem certeza?';
  confirmActionMessage.textContent = config.message || '';
  confirmActionWarning.textContent = config.warning || 'Essa acao exige confirmacao.';
  confirmActionButton.textContent = config.confirmText || 'Confirmar';
  confirmActionButton.className = config.danger
    ? 'h-12 rounded-2xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-dark hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50'
    : 'h-12 rounded-2xl bg-gold-500 px-5 text-sm font-extrabold text-black shadow-gold hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50';
  confirmActionButton.disabled = false;
  confirmActionModal.classList.remove('hidden');
  confirmActionModal.classList.add('flex');
}

function closeConfirmActionModal() {
  pendingConfirmAction = null;
  confirmActionModal.classList.add('hidden');
  confirmActionModal.classList.remove('flex');
  confirmActionButton.disabled = false;
}

async function runPendingConfirmAction() {
  if (!pendingConfirmAction?.onConfirm) return;

  const action = pendingConfirmAction;

  try {
    confirmActionButton.disabled = true;
    confirmActionButton.textContent = action.loadingText || 'Processando...';
    await action.onConfirm();
    closeConfirmActionModal();
  } catch (error) {
    confirmActionButton.disabled = false;
    confirmActionButton.textContent = action.confirmText || 'Confirmar';
    alert(error.message);
  }
}

function renderDisclosureContent(campaign, status) {
  disclosureTitle.textContent = `Divulgar ${campaign.title}`;

  if (!status.pode_disparar) {
    disclosureBody.innerHTML = `
      <div class="rounded-3xl border border-dashed border-gold-500/30 bg-black/35 p-5">
        <p class="text-sm font-extrabold text-gold-100">Esta e sua primeira campanha.</p>
        <p class="mt-2 text-sm font-semibold leading-relaxed text-panel-muted">O banco de dados de leads esta sendo abastecido. Assim que houver compradores pagos em uma campanha anterior, voce podera disparar novas campanhas para essa base.</p>
      </div>
    `;
    confirmDisclosureButton.classList.add('hidden');
    return;
  }

  disclosureBody.innerHTML = `
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-3xl border border-panel-line bg-black/35 p-5">
        <span class="text-xs font-bold uppercase tracking-wide text-panel-muted">Campanhas anteriores</span>
        <strong class="mt-2 block text-3xl font-extrabold text-gold-100">${Number(status.campanhas_anteriores || 0).toLocaleString('pt-BR')}</strong>
      </div>
      <div class="rounded-3xl border border-panel-line bg-black/35 p-5">
        <span class="text-xs font-bold uppercase tracking-wide text-panel-muted">Contatos que receberao</span>
        <strong class="mt-2 block text-3xl font-extrabold text-gold-100">${Number(status.contatos_disponiveis || 0).toLocaleString('pt-BR')}</strong>
      </div>
    </div>
    <div class="rounded-3xl border border-panel-line bg-panel-soft p-5">
      <p class="text-sm font-bold text-gold-100">Mensagem preparada</p>
      <p class="mt-2 text-sm font-semibold leading-relaxed text-panel-muted">Ola! Nova campanha no ar: ${escapeHtml(campaign.title)}. Garanta sua cota com mais chances de ganhar aqui: ${new URL(campaign.publicUrl, window.location.origin).href}</p>
    </div>
  `;
  confirmDisclosureButton.classList.remove('hidden');
  confirmDisclosureButton.disabled = Number(status.contatos_disponiveis || 0) === 0;
  confirmDisclosureButton.textContent = Number(status.contatos_disponiveis || 0) === 0
    ? 'Sem contatos para disparar'
    : `Confirmar disparo para ${Number(status.contatos_disponiveis || 0).toLocaleString('pt-BR')} contato(s)`;
}

async function openCampaignDisclosure(campaignId) {
  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) return;

  selectedDisclosureCampaign = campaign;
  disclosureTitle.textContent = `Divulgar ${campaign.title}`;
  disclosureBody.innerHTML = `
    <div class="rounded-3xl border border-panel-line bg-black/35 p-5 text-center">
      <p class="text-sm font-extrabold text-panel-muted">Verificando base de leads...</p>
    </div>
  `;
  confirmDisclosureButton.classList.add('hidden');
  openDisclosureModal();

  try {
    const response = await fetch(`/api/v1/admin/campanhas/${campaign.id}/verificar-disparo`, {
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel verificar o disparo.');
    }

    selectedDisclosureStatus = payload.data || {};
    renderDisclosureContent(campaign, selectedDisclosureStatus);
  } catch (error) {
    disclosureBody.innerHTML = `
      <div class="rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
        <p class="text-sm font-extrabold text-red-300">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function confirmDisclosureSend() {
  if (!selectedDisclosureCampaign || !selectedDisclosureStatus?.pode_disparar) return;

  confirmDisclosureButton.disabled = true;
  confirmDisclosureButton.textContent = 'Enfileirando disparos...';

  try {
    const response = await fetch(`/api/v1/admin/campanhas/${selectedDisclosureCampaign.id}/disparar-whatsapp`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel disparar a campanha.');
    }

    disclosureBody.innerHTML = `
      <div class="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p class="text-sm font-extrabold text-emerald-300">Disparo enfileirado com sucesso.</p>
        <p class="mt-2 text-sm font-semibold leading-relaxed text-panel-muted">${Number(payload.data?.contatos_enfileirados || 0).toLocaleString('pt-BR')} contato(s) entraram na fila. ${payload.data?.integracao_whatsapp_configurada ? 'Integracao WhatsApp configurada.' : 'Envio em modo simulado ate configurar WHATSAPP_API_URL e WHATSAPP_API_TOKEN.'}</p>
      </div>
    `;
    confirmDisclosureButton.classList.add('hidden');
  } catch (error) {
    disclosureBody.insertAdjacentHTML('beforeend', `
      <div class="rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
        <p class="text-sm font-extrabold text-red-300">${escapeHtml(error.message)}</p>
      </div>
    `);
    confirmDisclosureButton.disabled = false;
    confirmDisclosureButton.textContent = 'Tentar novamente';
  }
}

function renderCampaigns(items) {
  campaignGrid.innerHTML = '';

  if (!items.length) {
    campaignGrid.innerHTML = `
      <div class="rounded-[2rem] border border-dashed border-gold-500/30 bg-panel-card/80 p-10 text-center shadow-dark md:col-span-2 xl:col-span-3 2xl:col-span-4">
        <div class="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold-500 text-black shadow-gold">
          <i data-lucide="ticket-plus" class="h-8 w-8"></i>
        </div>
        <h2 class="mt-5 text-2xl font-black text-gold-50">Nenhuma campanha criada ainda</h2>
        <p class="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-panel-muted">Crie sua primeira rifa para gerar automaticamente a pagina de venda, receber pedidos e acompanhar compradores pelo painel.</p>
        <button class="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-6 text-sm font-extrabold text-black shadow-gold hover:bg-gold-300" type="button" data-empty-create-campaign>
          <i data-lucide="plus" class="h-5 w-5"></i>
          Criar primeira rifa
        </button>
      </div>
    `;
    campaignGrid.querySelector('[data-empty-create-campaign]')?.addEventListener('click', requestOpenCampaignModal);
    lucide.createIcons();
    return;
  }

  items.forEach((campaign) => {
    const node = template.content.cloneNode(true);
    node.querySelector('.campaign-image').src = campaign.image;
    node.querySelector('.campaign-image').alt = campaign.title;
    node.querySelector('.campaign-status').textContent = campaign.status;
    node.querySelector('.campaign-status').className += ` ${statusClasses(campaign.status)}`;
    node.querySelector('.campaign-title').textContent = campaign.title;
    node.querySelector('.campaign-slug').textContent = `/${campaign.slug}`;
    node.querySelector('.campaign-cotas').textContent = campaign.cotas.toLocaleString('pt-BR');
    node.querySelector('.campaign-price').textContent = campaign.price;
    node.querySelector('.campaign-sold').textContent = campaign.sold;
    node.querySelector('.edit-campaign').dataset.id = campaign.id;
    const hasOrders = Number(campaign.orders || 0) > 0;
    node.querySelector('.campaign-card .p-5').insertAdjacentHTML('beforeend', `
      <div class="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <a class="inline-flex h-11 items-center justify-center rounded-2xl border border-gold-500/40 bg-gold-500/10 px-4 text-sm font-extrabold text-gold-300 hover:bg-gold-500/20" href="${campaign.publicUrl}" target="_blank" rel="noreferrer">Abrir pagina</a>
        <button class="copy-campaign-link inline-flex h-11 items-center justify-center rounded-2xl border border-panel-line px-4 text-sm font-extrabold text-panel-muted hover:text-gold-50" type="button" data-url="${campaign.publicUrl}">Copiar link</button>
        <button class="open-disclosure inline-flex h-11 items-center justify-center rounded-2xl border border-panel-line px-4 text-sm font-extrabold text-panel-muted hover:text-gold-50" type="button" data-id="${campaign.id}">Divulgar</button>
        <button class="${hasOrders ? 'finish-campaign border-gold-500/30 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20' : 'delete-campaign border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'} inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-extrabold" type="button" data-id="${campaign.id}" data-title="${escapeHtml(campaign.title)}">${hasOrders ? 'Finalizar' : 'Excluir'}</button>
      </div>
    `);
    campaignGrid.appendChild(node);
  });

  campaignGrid.querySelectorAll('.copy-campaign-link').forEach((button) => {
    button.addEventListener('click', async () => {
      const url = new URL(button.dataset.url, window.location.origin).href;
      try {
        await navigator.clipboard.writeText(url);
        button.textContent = 'Copiado';
        setTimeout(() => {
          button.textContent = 'Copiar link';
        }, 1600);
      } catch (error) {
        window.prompt('Copie o link da campanha:', url);
      }
    });
  });

  campaignGrid.querySelectorAll('.open-disclosure').forEach((button) => {
    button.addEventListener('click', () => openCampaignDisclosure(button.dataset.id));
  });

  campaignGrid.querySelectorAll('.edit-campaign').forEach((button) => {
    button.addEventListener('click', () => openEditCampaignModal(button.dataset.id));
  });

  campaignGrid.querySelectorAll('.delete-campaign').forEach((button) => {
    button.addEventListener('click', () => deleteCampaign(button.dataset.id, button.dataset.title, button));
  });

  campaignGrid.querySelectorAll('.finish-campaign').forEach((button) => {
    button.addEventListener('click', () => finishCampaign(button.dataset.id, button.dataset.title, button));
  });

  lucide.createIcons();
}

async function deleteCampaign(campaignId, campaignTitle, button) {
  const title = campaignTitle || 'esta campanha';

  openConfirmActionModal({
    eyebrow: 'Excluir campanha',
    title: `Excluir "${title}"?`,
    message: 'Essa campanha sera removida da sua lista e nao podera ser recuperada depois.',
    warning: 'Campanhas com pedidos nao podem ser excluidas para preservar o historico de vendas. Nesse caso, use Finalizar.',
    confirmText: 'Sim, excluir campanha',
    loadingText: 'Excluindo...',
    danger: true,
    onConfirm: () => performDeleteCampaign(campaignId, button),
  });
}

async function performDeleteCampaign(campaignId, button) {
  try {
    button.disabled = true;
    button.textContent = 'Excluindo...';

    const response = await fetch(`/api/v1/admin/campanhas/${campaignId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    if (!response.ok) {
      let message = 'Nao foi possivel excluir a campanha.';
      try {
        const payload = await response.json();
        message = payload.error?.message || message;
      } catch (error) {
        // Mantem a mensagem padrao quando a resposta nao for JSON.
      }

      throw new Error(message);
    }

    campaigns = campaigns.filter((campaign) => campaign.id !== campaignId);
    renderCampaigns(campaigns);
    renderBuyerCampaignOptions();
    await fetchDashboardStats();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Excluir';
    throw error;
  }
}

async function finishCampaign(campaignId, campaignTitle, button) {
  const title = campaignTitle || 'esta campanha';

  openConfirmActionModal({
    eyebrow: 'Finalizar campanha',
    title: `Finalizar "${title}"?`,
    message: 'Ela saira de Minhas rifas e ficara disponivel na aba Historico.',
    warning: 'Os pedidos, compradores e cotas pagas serao preservados para consulta futura.',
    confirmText: 'Sim, finalizar campanha',
    loadingText: 'Finalizando...',
    danger: false,
    onConfirm: () => performFinishCampaign(campaignId, button),
  });
}

async function performFinishCampaign(campaignId, button) {
  try {
    button.disabled = true;
    button.textContent = 'Finalizando...';

    const response = await fetch(`/api/v1/admin/campanhas/${campaignId}/finalizar`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel finalizar a campanha.');
    }

    campaigns = campaigns.filter((campaign) => campaign.id !== campaignId);
    renderCampaigns(campaigns);
    renderBuyerCampaignOptions();
    await fetchDashboardStats();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Finalizar';
    throw error;
  }
}

function renderOrderCampaigns() {
  if (!ordersCampaignList) return;

  ordersCampaignList.innerHTML = '';

  if (!campaigns.filter((campaign) => campaign.status === 'Ativo').length) {
    ordersCampaignList.innerHTML = `
      <div class="rounded-3xl border border-dashed border-gold-500/30 bg-panel-card p-8 text-center lg:col-span-3">
        <p class="text-sm font-extrabold text-panel-muted">Nenhuma campanha ativa para auditar pedidos.</p>
      </div>
    `;
    return;
  }

  campaigns.filter((campaign) => campaign.status === 'Ativo').forEach((campaign) => {
    const article = document.createElement('article');
    article.className = 'rounded-3xl border border-panel-line bg-panel-card p-5 shadow-dark transition hover:-translate-y-0.5 hover:shadow-gold';
    article.innerHTML = `
      <div class="relative mb-5 aspect-[16/9] overflow-hidden rounded-2xl bg-panel-soft">
        <img class="h-full w-full object-cover opacity-90" src="${campaign.image}" alt="${campaign.title}">
        <span class="absolute left-4 top-4 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-extrabold text-gold-300 ring-1 ring-gold-500/35">Ativa</span>
      </div>
      <h2 class="text-xl font-extrabold text-gold-50">${campaign.title}</h2>
      <p class="mt-1 text-sm font-semibold text-panel-muted">/${campaign.slug}</p>
      <div class="mt-5 grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-black/35 p-4 ring-1 ring-panel-line">
          <span class="text-xs font-bold text-panel-muted">Pedidos</span>
          <strong class="mt-1 block text-2xl font-extrabold text-gold-100">${campaign.orders}</strong>
        </div>
        <div class="rounded-2xl bg-black/35 p-4 ring-1 ring-panel-line">
          <span class="text-xs font-bold text-panel-muted">Receita</span>
          <strong class="mt-1 block text-2xl font-extrabold text-gold-100">${campaign.revenue}</strong>
        </div>
      </div>
      <button class="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 text-sm font-extrabold text-black hover:bg-gold-300" type="button">
        <i data-lucide="receipt-text" class="h-5 w-5"></i>
        Gerenciar pedidos
      </button>
    `;
    ordersCampaignList.appendChild(article);
  });

  lucide.createIcons();
}

function renderRifinhas(items) {
  if (!rifinhasList) return;

  rifinhasList.innerHTML = '';

  if (!items.length) {
    rifinhasList.innerHTML = `
      <div class="rounded-3xl border border-dashed border-gold-500/30 bg-panel-card p-8 text-center lg:col-span-3">
        <p class="text-sm font-extrabold text-panel-muted">Nenhuma rifinha criada ainda.</p>
      </div>
    `;
    return;
  }

  rifinhasList.innerHTML = items.map((rifinha) => `
    <article class="rounded-3xl border border-panel-line bg-panel-card p-6 shadow-dark">
      <span class="inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusClasses(rifinha.status === 'ativo' ? 'Ativo' : 'Pausado')}">${rifinha.status === 'ativo' ? 'Ativa' : 'Pausada'}</span>
      <h2 class="mt-4 text-xl font-extrabold text-gold-50">${escapeHtml(rifinha.titulo)}</h2>
      <p class="mt-2 text-sm font-medium text-panel-muted">${escapeHtml(rifinha.campanha?.titulo || 'Campanha')}</p>
      <div class="mt-5 grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-black/35 p-3 ring-1 ring-panel-line">
          <span class="block text-xs font-bold text-panel-muted">Cotas</span>
          <strong class="mt-1 block text-sm font-extrabold text-gold-100">${Number(rifinha.totalCotas || 0).toLocaleString('pt-BR')}</strong>
        </div>
        <div class="rounded-2xl bg-black/35 p-3 ring-1 ring-panel-line">
          <span class="block text-xs font-bold text-panel-muted">Valor</span>
          <strong class="mt-1 block text-sm font-extrabold text-gold-100">${formatMoney(rifinha.valorCota)}</strong>
        </div>
      </div>
    </article>
  `).join('');
}

function renderOrders(orders) {
  if (!ordersList) return;

  if (!orders.length) {
    ordersList.innerHTML = `
      <div class="p-8 text-center">
        <p class="text-sm font-bold text-panel-muted">Nenhum pedido encontrado.</p>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = orders.map((order) => {
    const status = order.status_pagamento || 'pendente';
    const cotas = Array.isArray(order.cotas) ? order.cotas : [];
    const initials = (order.nome_comprador || 'C').slice(0, 2).toUpperCase();

    return `
      <article class="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
        <div class="flex items-center gap-4">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-500 text-sm font-extrabold text-black">${initials}</div>
          <div class="min-w-0">
            <h3 class="truncate text-base font-extrabold text-gold-50">${order.nome_comprador || 'Comprador'}</h3>
            <p class="mt-1 truncate text-sm font-semibold text-panel-muted">${order.whatsapp_comprador || '-'}</p>
          </div>
        </div>
        <div>
          <p class="truncate text-sm font-bold text-gold-100">${order.campanha?.titulo || 'Campanha'}</p>
          <p class="mt-1 text-xs font-semibold text-panel-muted">Cotas: ${cotas.map((n) => String(n).padStart(3, '0')).join(', ') || '-'}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3 lg:justify-end">
          <span class="rounded-full px-3 py-1 text-xs font-extrabold uppercase ${paymentStatusClasses(status)}">${status}</span>
          <strong class="text-base font-extrabold text-gold-50">${formatMoney(order.valor_total)}</strong>
        </div>
      </article>
    `;
  }).join('');
}

async function loadOrders() {
  if (!ordersList) return;

  ordersList.innerHTML = `
    <div class="p-8 text-center">
      <p class="text-sm font-bold text-panel-muted">Carregando pedidos...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/v1/admin/pedidos?limit=50', {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao buscar pedidos');
    const payload = await response.json();
    renderOrders(payload.data || []);
  } catch (error) {
    renderOrders([]);
  }

  lucide.createIcons();
}

async function fetchAdminCampanhas() {
  const token = getAdminToken();

  if (!token) {
    campaigns = [];
    campaignGrid.innerHTML = `
      <div class="rounded-3xl border border-dashed border-gold-500/30 bg-panel-card p-8 text-center lg:col-span-3">
        <p class="text-sm font-extrabold text-panel-muted">Faça login no painel para carregar suas campanhas.</p>
      </div>
    `;
    return;
  }

  campaignGrid.innerHTML = `
    <div class="rounded-3xl border border-panel-line bg-panel-card p-8 text-center lg:col-span-3">
      <p class="text-sm font-extrabold text-panel-muted">Carregando campanhas...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/v1/admin/campanhas', {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error('Falha ao buscar campanhas');
    const payload = await response.json();
    campaigns = (payload.data || []).map(mapApiCampaign);
  } catch (error) {
    campaigns = [];
    campaignGrid.innerHTML = `
      <div class="rounded-3xl border border-red-500/30 bg-panel-card p-8 text-center lg:col-span-3">
        <p class="text-sm font-extrabold text-red-300">${escapeHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  renderCampaigns(campaigns);
  renderBuyerCampaignOptions();
}

async function fetchAdminRifinhas() {
  if (!getAdminToken()) {
    rifinhas = [];
    renderRifinhas(rifinhas);
    return;
  }

  rifinhasList.innerHTML = `
    <div class="rounded-3xl border border-panel-line bg-panel-card p-8 text-center lg:col-span-3">
      <p class="text-sm font-extrabold text-panel-muted">Carregando rifinhas...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/v1/admin/rifinhas', {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error('Falha ao buscar rifinhas');
    const payload = await response.json();
    rifinhas = payload.data || [];
  } catch (error) {
    rifinhas = [];
  }

  renderRifinhas(rifinhas);
}

function setActiveTab(tab) {
  navItems.forEach((item) => {
    const isActive = item.dataset.tab === tab;
    item.classList.toggle('active', isActive);
  });

  screens.forEach((screen) => {
    screen.classList.toggle('hidden', screen.dataset.screen !== tab);
  });

  if (tab === 'pedidos') {
    loadOrders();
  }

  if (tab === 'rifinhas') {
    fetchAdminRifinhas();
  }

  if (tab === 'perfil') {
    fetchAdminProfile();
  }

  if (tab === 'compradores') {
    fetchCompradoresStats();
  }

  if (tab === 'historico') {
    fetchHistorico();
  }
}

function filterCampaigns(value) {
  const query = value.trim().toLowerCase();

  if (!query) {
    renderCampaigns(campaigns);
    return;
  }

  renderCampaigns(campaigns.filter((campaign) => {
    return campaign.title.toLowerCase().includes(query)
      || campaign.slug.toLowerCase().includes(query)
      || campaign.status.toLowerCase().includes(query);
  }));
}

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function setCampaignModalMode(mode, campaign = null) {
  const editing = mode === 'edit';
  editingCampaignId = editing ? campaign?.id : null;

  if (campaignModalEyebrow) {
    campaignModalEyebrow.textContent = editing ? 'Editar rifa' : 'Nova rifa';
  }

  if (campaignModalTitle) {
    campaignModalTitle.textContent = editing ? 'Editar campanha' : 'Criar rifa';
  }

  if (campaignSubmitButton) {
    campaignSubmitButton.textContent = editing ? 'Salvar alterações' : 'Salvar campanha';
  }

  const imageInput = campaignForm.elements.imagem;
  if (imageInput) {
    imageInput.required = !editing;
  }
}

function fillCampaignForm(campaign) {
  const metadata = campaign.metadata || {};

  campaignForm.elements.titulo.value = campaign.title || '';
  campaignForm.elements.premio_principal.value = metadata.premio_principal || '';
  campaignForm.elements.data_sorteio.value = formatDateTimeLocal(campaign.drawDate);
  campaignForm.elements.tipo_campanha.value = metadata.tipo_campanha === 'gratuita' ? 'gratuita' : 'paga';
  campaignForm.elements.valor_cota.value = String(campaign.quotaValue || '');
  campaignForm.elements.total_cotas.value = String(campaign.totalQuotas || '');
  campaignForm.elements.reserva_expira_minutos.value = String(metadata.reserva_expira_minutos || 15);
  campaignForm.elements.min_cotas_por_pedido.value = String(metadata.min_cotas_por_pedido || 1);
  campaignForm.elements.max_cotas_por_pedido.value = String(metadata.max_cotas_por_pedido || 100);
  campaignForm.elements.descricao.value = campaign.description || '';
  campaignForm.elements.regulamento.value = campaign.rules || '';
  campaignForm.elements.instrucoes_pagamento.value = metadata.instrucoes_pagamento || '';
  campaignForm.elements.status.value = campaign.rawStatus || 'ativo';
  updateCampaignTypeUi();
}

function openCampaignModal() {
  campaignModal.classList.remove('hidden');
  campaignModal.classList.add('flex');
  campaignForm.elements.titulo.focus();
}

function requestOpenCampaignModal() {
  campaignForm.reset();
  setCampaignModalMode('create');
  updateCampaignTypeUi();
  openCampaignModal();
}

function openEditCampaignModal(campaignId) {
  const campaign = campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    alert('Campanha nao encontrada no painel.');
    return;
  }

  campaignForm.reset();
  setCampaignModalMode('edit', campaign);
  fillCampaignForm(campaign);
  openCampaignModal();
}

function closeCampaignModal() {
  campaignModal.classList.add('hidden');
  campaignModal.classList.remove('flex');
  campaignForm.reset();
  setCampaignModalMode('create');
  updateCampaignTypeUi();
}

async function createCampaignFromForm(event) {
  event.preventDefault();
  const formData = new FormData(campaignForm);
  const submitButton = campaignForm.querySelector('button[type="submit"]');
  const isEditing = Boolean(editingCampaignId);

  if (!gatewayConnected && !isFreeCampaignForm()) {
    closeCampaignModal();
    setActiveTab('perfil');
    showProfileFeedback('Complete o cadastro de recebimento antes de criar uma rifa.', 'error');
    return;
  }

  if (!getAdminToken()) {
    alert('Faça login no painel antes de criar campanhas.');
    return;
  }

  const totalCotas = Number(formData.get('total_cotas') || 0);
  const minCotas = Number(formData.get('min_cotas_por_pedido') || 0);
  const maxCotas = Number(formData.get('max_cotas_por_pedido') || 0);

  if (submitButton?.disabled) {
    return;
  }

  if (minCotas > maxCotas) {
    alert('O minimo de cotas por pedido nao pode ser maior que o maximo.');
    return;
  }

  if (maxCotas > totalCotas) {
    alert('O maximo de cotas por pedido nao pode ser maior que o total de cotas da campanha.');
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando...';
  }

  formData.set('metadata', JSON.stringify({
    tipo_campanha: formData.get('tipo_campanha'),
    sem_fins_lucrativos: formData.get('tipo_campanha') === 'gratuita',
    premio_principal: formData.get('premio_principal'),
    reserva_expira_minutos: Number(formData.get('reserva_expira_minutos') || 15),
    min_cotas_por_pedido: minCotas,
    max_cotas_por_pedido: maxCotas,
    instrucoes_pagamento: formData.get('instrucoes_pagamento'),
  }));

  try {
    const response = await fetch(isEditing ? `/api/v1/admin/campanhas/${editingCampaignId}` : '/api/v1/admin/campanhas', {
      method: isEditing ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || (isEditing ? 'Nao foi possivel editar campanha.' : 'Nao foi possivel criar campanha.'));
    }

    closeCampaignModal();
    await fetchAdminCampanhas();
  } catch (error) {
    alert(error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = isEditing ? 'Salvar alterações' : 'Salvar campanha';
    }
  }
}

async function submitProfileForm(event) {
  event.preventDefault();
  hideProfileFeedback();

  if (!getAdminToken()) {
    window.location.href = '/login';
    return;
  }

  const formData = new FormData(profileForm);

  try {
    const response = await fetch('/api/v1/admin/perfil', {
      method: 'PUT',
      headers: {
        ...authHeaders(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: formData.get('nome'),
        email: formData.get('email'),
        whatsapp: formData.get('whatsapp'),
        telefone_mensagens: formData.get('telefone_mensagens'),
        pix_tipo: formData.get('pix_tipo'),
        pix_chave: formData.get('pix_chave'),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel salvar o perfil.');
    }

    localStorage.setItem('admin_user', JSON.stringify(payload.data));
    renderAdminProfile();
    fillProfileForm(payload.data);
    showProfileFeedback('Dados do perfil salvos com sucesso.');
  } catch (error) {
    showProfileFeedback(error.message, 'error');
  }
}

async function bootstrapPanel() {
  renderAdminProfile();

  if (!getAdminToken()) {
    window.location.href = '/login';
    return;
  }

  await fetchAdminProfile();
  await fetchMercadoPagoStatus();
  await fetchAsaasStatus();
  await fetchAsaasBalance();
  await fetchAdminCampanhas();
  handleGatewayReturnMessage();
}

navItems.forEach((item) => {
  item.addEventListener('click', () => setActiveTab(item.dataset.tab));
});

searchInput.addEventListener('input', (event) => filterCampaigns(event.target.value));
document.querySelector('#openCampaignModal').addEventListener('click', requestOpenCampaignModal);
document.querySelector('#closeCampaignModal').addEventListener('click', closeCampaignModal);
document.querySelector('#cancelCampaignModal').addEventListener('click', closeCampaignModal);
document.querySelector('#campaignModal').addEventListener('click', (event) => {
  if (event.target.id === 'campaignModal') closeCampaignModal();
});
disclosureModal.addEventListener('click', (event) => {
  if (event.target.id === 'disclosureModal') closeDisclosureModal();
});
confirmActionModal.addEventListener('click', (event) => {
  if (event.target.id === 'confirmActionModal') closeConfirmActionModal();
});
campaignForm.addEventListener('submit', createCampaignFromForm);
if (campaignType) campaignType.addEventListener('change', updateCampaignTypeUi);
if (refreshOrdersButton) refreshOrdersButton.addEventListener('click', loadOrders);
if (buyersCampaignSelect) buyersCampaignSelect.addEventListener('change', fetchCompradoresStats);
profileButton.addEventListener('click', () => setActiveTab('perfil'));
headerLogoutButton.addEventListener('click', clearSession);
profileForm.addEventListener('submit', submitProfileForm);
logoutButton.addEventListener('click', clearSession);
if (connectMercadoPagoButton) connectMercadoPagoButton.addEventListener('click', connectMercadoPago);
if (disconnectMercadoPagoButton) disconnectMercadoPagoButton.addEventListener('click', disconnectMercadoPago);
if (connectAsaasButton) connectAsaasButton.addEventListener('click', connectAsaas);
if (disconnectAsaasButton) disconnectAsaasButton.addEventListener('click', disconnectAsaas);
if (refreshAsaasBalanceButton) refreshAsaasBalanceButton.addEventListener('click', fetchAsaasBalance);
if (requestAsaasWithdrawalButton) requestAsaasWithdrawalButton.addEventListener('click', requestAsaasWithdrawal);
closeDisclosureModalButton.addEventListener('click', closeDisclosureModal);
cancelDisclosureModalButton.addEventListener('click', closeDisclosureModal);
confirmDisclosureButton.addEventListener('click', confirmDisclosureSend);
closeConfirmActionModalButton.addEventListener('click', closeConfirmActionModal);
cancelConfirmActionButton.addEventListener('click', closeConfirmActionModal);
confirmActionButton.addEventListener('click', runPendingConfirmAction);

updateCampaignTypeUi();
bootstrapPanel();
lucide.createIcons();
