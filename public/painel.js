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
const statActiveCampaigns = document.querySelector('#statActiveCampaigns');
const statOrdersToday = document.querySelector('#statOrdersToday');
const statPendingRevenue = document.querySelector('#statPendingRevenue');
const statSoldQuotas = document.querySelector('#statSoldQuotas');
const adminInitials = document.querySelector('#adminInitials');
const adminName = document.querySelector('#adminName');
const profileButton = document.querySelector('#profileButton');
const profileForm = document.querySelector('#profileForm');
const profileFeedback = document.querySelector('#profileFeedback');
const logoutButton = document.querySelector('#logoutButton');
const loginModal = document.querySelector('#loginModal');
const loginForm = document.querySelector('#loginForm');
const loginError = document.querySelector('#loginError');

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

function showLoginModal() {
  loginModal.classList.remove('hidden');
  loginModal.classList.add('flex');
  loginForm.elements.login.focus();
}

function hideLoginModal() {
  loginModal.classList.add('hidden');
  loginModal.classList.remove('flex');
  loginError.classList.add('hidden');
  loginError.textContent = '';
  loginForm.reset();
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
  profileForm.elements.nome.value = profile?.nome || '';
  profileForm.elements.email.value = profile?.email || '';
  profileForm.elements.whatsapp.value = profile?.whatsapp || '';
  profileForm.elements.telefone_mensagens.value = profile?.telefone_mensagens || '';
  profileForm.elements.pix_tipo.value = profile?.pix_tipo || '';
  profileForm.elements.pix_chave.value = profile?.pix_chave || '';
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

function clearSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('token');
  localStorage.removeItem('admin_user');
  campaigns = [];
  rifinhas = [];
  renderAdminProfile();
  renderDashboardStats();
  renderCampaigns([]);
  renderRifinhas([]);
  renderOrders([]);
  fillProfileForm({});
  hideProfileFeedback();
  ordersCampaignList.innerHTML = '';
  showLoginModal();
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
    title: campaign.titulo,
    slug: campaign.slug,
    publicUrl: `/rifa/${campaign.slug}`,
    status: campaign.status === 'ativo' ? 'Ativo' : 'Pausado',
    image: campaign.imagemUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80',
    cotas: campaign.totalCotas || 0,
    price: formatMoney(campaign.valorCota),
    sold: sold.toLocaleString('pt-BR'),
    orders: pedidos.length,
    revenue: formatMoney(revenue),
  };
}

function renderCampaigns(items) {
  campaignGrid.innerHTML = '';

  if (!items.length) {
    campaignGrid.innerHTML = `
      <div class="rounded-3xl border border-dashed border-gold-500/30 bg-panel-card p-8 text-center lg:col-span-3">
        <p class="text-sm font-extrabold text-panel-muted">Nenhuma campanha criada ainda.</p>
      </div>
    `;
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
    node.querySelector('.campaign-card .p-5').insertAdjacentHTML('beforeend', `
      <div class="mt-5 grid grid-cols-2 gap-3">
        <a class="inline-flex h-11 items-center justify-center rounded-2xl border border-gold-500/40 bg-gold-500/10 px-4 text-sm font-extrabold text-gold-300 hover:bg-gold-500/20" href="${campaign.publicUrl}" target="_blank" rel="noreferrer">Abrir pagina</a>
        <button class="copy-campaign-link inline-flex h-11 items-center justify-center rounded-2xl border border-panel-line px-4 text-sm font-extrabold text-panel-muted hover:text-gold-50" type="button" data-url="${campaign.publicUrl}">Copiar link</button>
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

  lucide.createIcons();
}

function renderOrderCampaigns() {
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
    renderOrderCampaigns();
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
    renderOrderCampaigns();
    return;
  }

  renderCampaigns(campaigns);
  renderOrderCampaigns();
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

function openCampaignModal() {
  campaignModal.classList.remove('hidden');
  campaignModal.classList.add('flex');
  campaignForm.elements.titulo.focus();
}

function closeCampaignModal() {
  campaignModal.classList.add('hidden');
  campaignModal.classList.remove('flex');
  campaignForm.reset();
}

async function createCampaignFromForm(event) {
  event.preventDefault();
  const formData = new FormData(campaignForm);

  if (!getAdminToken()) {
    alert('Faça login no painel antes de criar campanhas.');
    return;
  }

  const totalCotas = Number(formData.get('total_cotas') || 0);
  const minCotas = Number(formData.get('min_cotas_por_pedido') || 0);
  const maxCotas = Number(formData.get('max_cotas_por_pedido') || 0);

  if (minCotas > maxCotas) {
    alert('O minimo de cotas por pedido nao pode ser maior que o maximo.');
    return;
  }

  if (maxCotas > totalCotas) {
    alert('O maximo de cotas por pedido nao pode ser maior que o total de cotas da campanha.');
    return;
  }

  formData.set('metadata', JSON.stringify({
    premio_principal: formData.get('premio_principal'),
    reserva_expira_minutos: Number(formData.get('reserva_expira_minutos') || 15),
    min_cotas_por_pedido: minCotas,
    max_cotas_por_pedido: maxCotas,
    whatsapp_suporte: formData.get('whatsapp_suporte'),
    instrucoes_pagamento: formData.get('instrucoes_pagamento'),
  }));

  try {
    const response = await fetch('/api/v1/admin/campanhas', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel criar campanha.');
    }

    closeCampaignModal();
    await fetchDashboardStats();
    await fetchAdminCampanhas();
  } catch (error) {
    alert(error.message);
  }
}

async function submitProfileForm(event) {
  event.preventDefault();
  hideProfileFeedback();

  if (!getAdminToken()) {
    showLoginModal();
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

async function submitLogin(event) {
  event.preventDefault();
  loginError.classList.add('hidden');
  loginError.textContent = '';

  const formData = new FormData(loginForm);

  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: formData.get('login'),
        password: formData.get('password'),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel entrar.');
    }

    localStorage.setItem('admin_token', payload.data.token);
    localStorage.setItem('admin_user', JSON.stringify(payload.data.admin));
    renderAdminProfile();
    hideLoginModal();
    await fetchAdminProfile();
    await fetchDashboardStats();
    await fetchAdminCampanhas();
    await fetchAdminRifinhas();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  }
}

async function bootstrapPanel() {
  renderAdminProfile();

  if (!getAdminToken()) {
    renderDashboardStats();
    renderCampaigns([]);
    renderRifinhas([]);
    renderOrders([]);
    ordersCampaignList.innerHTML = '';
    showLoginModal();
    return;
  }

  await fetchAdminProfile();
  await fetchDashboardStats();
  await fetchAdminCampanhas();
}

navItems.forEach((item) => {
  item.addEventListener('click', () => setActiveTab(item.dataset.tab));
});

searchInput.addEventListener('input', (event) => filterCampaigns(event.target.value));
document.querySelector('#openCampaignModal').addEventListener('click', openCampaignModal);
document.querySelector('#closeCampaignModal').addEventListener('click', closeCampaignModal);
document.querySelector('#cancelCampaignModal').addEventListener('click', closeCampaignModal);
document.querySelector('#campaignModal').addEventListener('click', (event) => {
  if (event.target.id === 'campaignModal') closeCampaignModal();
});
campaignForm.addEventListener('submit', createCampaignFromForm);
refreshOrdersButton.addEventListener('click', loadOrders);
loginForm.addEventListener('submit', submitLogin);
profileButton.addEventListener('click', () => setActiveTab('perfil'));
profileForm.addEventListener('submit', submitProfileForm);
logoutButton.addEventListener('click', clearSession);

bootstrapPanel();
lucide.createIcons();
