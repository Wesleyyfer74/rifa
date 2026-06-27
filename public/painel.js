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

const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
const screens = document.querySelectorAll('.panel-screen');
const campaignGrid = document.querySelector('#campaignGrid');
const ordersCampaignList = document.querySelector('#ordersCampaignList');
const searchInput = document.querySelector('#campaignSearch');
const template = document.querySelector('#campaignCardTemplate');

function statusClasses(status) {
  if (status === 'Ativo') {
    return 'bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/35';
  }

  return 'bg-white/5 text-panel-muted ring-1 ring-white/10';
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

function setActiveTab(tab) {
  navItems.forEach((item) => {
    const isActive = item.dataset.tab === tab;
    item.classList.toggle('active', isActive);
  });

  screens.forEach((screen) => {
    screen.classList.toggle('hidden', screen.dataset.screen !== tab);
  });
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

navItems.forEach((item) => {
  item.addEventListener('click', () => setActiveTab(item.dataset.tab));
});

searchInput.addEventListener('input', (event) => filterCampaigns(event.target.value));

renderCampaigns(campaigns);
renderOrderCampaigns();
lucide.createIcons();
