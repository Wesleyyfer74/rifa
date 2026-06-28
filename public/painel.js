const campaigns = [
  {
    title: 'Grande Rifa Do Cipriano',
    slug: 'grande-rifa-do-cipriano',
    status: 'Ativo',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    cotas: 10000,
    price: 'R$ 10,00',
    sold: '6.482',
    orders: 842,
    revenue: 'R$ 64.820',
  },
  {
    title: 'Rifa iPhone 15 Pro Max',
    slug: 'rifa-iphone-15-pro-max',
    status: 'Ativo',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80',
    cotas: 5000,
    price: 'R$ 8,00',
    sold: '2.194',
    orders: 311,
    revenue: 'R$ 17.552',
  },
  {
    title: 'MacBook Pro Premiado',
    slug: 'macbook-pro-premiado',
    status: 'Pausado',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
    cotas: 7000,
    price: 'R$ 12,00',
    sold: '1.090',
    orders: 188,
    revenue: 'R$ 13.080',
  },
  {
    title: 'Pix da Sorte - R$ 5.000',
    slug: 'pix-da-sorte-5000',
    status: 'Ativo',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80',
    cotas: 3000,
    price: 'R$ 5,00',
    sold: '2.870',
    orders: 504,
    revenue: 'R$ 14.350',
  },
];

const fallbackOrders = [
  {
    id: 'preview-001',
    campanha: { titulo: 'Grande Rifa Do Cipriano', slug: 'grande-rifa-do-cipriano' },
    nome_comprador: 'José Silva',
    whatsapp_comprador: '65999999999',
    cotas: [1, 5, 12],
    status_pagamento: 'pago',
    valor_total: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: 'preview-002',
    campanha: { titulo: 'Pix da Sorte - R$ 5.000', slug: 'pix-da-sorte-5000' },
    nome_comprador: 'Maria Souza',
    whatsapp_comprador: '65988888888',
    cotas: [20, 21],
    status_pagamento: 'pendente',
    valor_total: 10,
    created_at: new Date().toISOString(),
  },
];

const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
const screens = document.querySelectorAll('.panel-screen');
const campaignGrid = document.querySelector('#campaignGrid');
const ordersCampaignList = document.querySelector('#ordersCampaignList');
const ordersList = document.querySelector('#ordersList');
const refreshOrdersButton = document.querySelector('#refreshOrders');
const searchInput = document.querySelector('#campaignSearch');
const template = document.querySelector('#campaignCardTemplate');
const campaignModal = document.querySelector('#campaignModal');
const campaignForm = document.querySelector('#campaignForm');

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

function renderCampaigns(items) {
  campaignGrid.innerHTML = '';

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
    campaignGrid.appendChild(node);
  });

  lucide.createIcons();
}

function renderOrderCampaigns() {
  ordersCampaignList.innerHTML = '';

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
    const response = await fetch('/api/v1/admin/pedidos?limit=50');
    if (!response.ok) throw new Error('Falha ao buscar pedidos');
    const payload = await response.json();
    renderOrders(payload.data || []);
  } catch (error) {
    renderOrders(fallbackOrders);
  }

  lucide.createIcons();
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
  campaignForm.elements.title.focus();
}

function closeCampaignModal() {
  campaignModal.classList.add('hidden');
  campaignModal.classList.remove('flex');
  campaignForm.reset();
}

function createCampaignFromForm(event) {
  event.preventDefault();
  const formData = new FormData(campaignForm);
  const title = String(formData.get('title')).trim();
  const image = String(formData.get('image')).trim();
  const price = Number(formData.get('price'));
  const cotas = Number(formData.get('maxCotas'));

  campaigns.unshift({
    title,
    slug: slugify(title),
    status: 'Ativo',
    image,
    cotas,
    price: formatMoney(price),
    sold: '0',
    orders: 0,
    revenue: formatMoney(0),
  });

  renderCampaigns(campaigns);
  renderOrderCampaigns();
  closeCampaignModal();
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

renderCampaigns(campaigns);
renderOrderCampaigns();
lucide.createIcons();
