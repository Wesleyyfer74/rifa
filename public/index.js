const carousel = document.querySelector('#raffleCarousel');
const prevButton = document.querySelector('[data-carousel-prev]');
const nextButton = document.querySelector('[data-carousel-next]');

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getField(item, snakeName, camelName) {
  return item?.[snakeName] ?? item?.[camelName];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildImage(imageUrl, title) {
  if (!imageUrl) {
    return '<div class="raffle-card-image" aria-hidden="true"></div>';
  }

  return `
    <div class="raffle-card-image">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">
      <span class="status-badge">Ativa</span>
    </div>
  `;
}

function renderCampaignCard(campaign) {
  const title = getField(campaign, 'titulo', 'titulo') || 'Rifa ativa';
  const slug = getField(campaign, 'slug', 'slug') || '';
  const imageUrl = getField(campaign, 'imagem_url', 'imagemUrl');
  const value = getField(campaign, 'valor_cota', 'valorCota');
  const total = getField(campaign, 'total_cotas', 'totalCotas');
  const description = getField(campaign, 'descricao', 'descricao') || 'Participe comprando pacotes de cotas e acompanhe sua reserva pelo checkout.';

  return `
    <article class="raffle-card">
      ${buildImage(imageUrl, title)}
      <div class="raffle-card-body">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description).slice(0, 120)}</p>
        <div class="raffle-meta">
          <span>Valor da cota<strong>${formatMoney(value)}</strong></span>
          <span>Total de cotas<strong>${Number(total || 0).toLocaleString('pt-BR')}</strong></span>
        </div>
        <a class="primary-button" href="/rifa/${encodeURIComponent(slug)}">Comprar cotas</a>
      </div>
    </article>
  `;
}

function renderEmptyState() {
  carousel.innerHTML = `
    <article class="empty-card empty-card-simple">
      <strong>Nenhuma rifa ativa no momento.</strong>
    </article>
  `;
}

async function fetchPublicCampaigns() {
  try {
    const response = await fetch('/api/v1/campanhas', {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Falha ao carregar rifas.');
    }

    const payload = await response.json();
    const campaigns = Array.isArray(payload.data) ? payload.data : [];

    if (!campaigns.length) {
      renderEmptyState();
      return;
    }

    carousel.innerHTML = campaigns.map(renderCampaignCard).join('');
  } catch (error) {
    carousel.innerHTML = `
      <article class="empty-card">
        <div>
          <strong>Nao foi possivel carregar as rifas agora.</strong>
          <p>Tente novamente em instantes ou acesse a area do rifeiro.</p>
        </div>
      </article>
    `;
  }
}

function setupCarouselButtons() {
  const scrollAmount = 380;

  prevButton?.addEventListener('click', () => {
    carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  nextButton?.addEventListener('click', () => {
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
}

setupCarouselButtons();
fetchPublicCampaigns();
