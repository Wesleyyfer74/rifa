const numbersGrid = document.querySelector('#numbersGrid');
const selectedCount = document.querySelector('#selectedCount');
const selectedTotal = document.querySelector('#selectedTotal');
const cartBadge = document.querySelector('.cart-link span');
const salesTicker = document.querySelector('.sales-ticker');
const salesTickerText = document.querySelector('#salesTickerText');
const openBuyerArea = document.querySelector('#openBuyerArea');
const closeBuyerArea = document.querySelector('#closeBuyerArea');
const buyerModal = document.querySelector('#buyerModal');
const buyerForm = document.querySelector('#buyerForm');
const buyerResults = document.querySelector('#buyerResults');
const selected = new Set([1, 2, 3, 13, 14]);
const price = 10;
let latestEsteiraText = '';

function formatMoney(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function updateTotals() {
  selectedCount.textContent = selected.size;
  selectedTotal.textContent = formatMoney(selected.size * price);
  cartBadge.textContent = selected.size;
}

function renderNumbers() {
  const unavailable = new Set([4, 5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 20]);
  const specialLabels = new Map([[10, '010'], [12, '012']]);

  for (let i = 1; i <= 40; i += 1) {
    const button = document.createElement('button');
    button.className = 'number-ball';
    button.type = 'button';
    button.textContent = specialLabels.get(i) || String(i).padStart(3, '0');

    if (selected.has(i)) {
      button.classList.add('selected');
    }

    if (unavailable.has(i) && !selected.has(i)) {
      button.classList.add('unavailable');
    }

    button.addEventListener('click', () => {
      if (button.classList.contains('unavailable')) return;

      if (selected.has(i)) {
        selected.delete(i);
        button.classList.remove('selected');
      } else {
        selected.add(i);
        button.classList.add('selected');
      }

      updateTotals();
    });

    numbersGrid.appendChild(button);
  }
}

function formatPercent(value) {
  const number = Number(value || 0);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(1);
}

function buildTickerText(items) {
  return items
    .map((item) => `${item.comprador} adquiriu ${formatPercent(item.percentual)}% de cotas`)
    .join(' > ');
}

function setTickerText(text) {
  if (!salesTicker || !salesTickerText || !text || text === latestEsteiraText) {
    return;
  }

  latestEsteiraText = text;
  salesTickerText.textContent = `${text} > ${text}`;
  salesTicker.classList.add('has-sales');
}

async function loadSalesTicker() {
  if (!salesTicker || !salesTickerText) {
    return;
  }

  const slug = salesTicker.dataset.campaignSlug;

  try {
    const response = await fetch(`/api/v1/campanhas/${slug}/esteira`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Falha ao carregar esteira.');
    }

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];

    if (items.length === 0) {
      salesTicker.classList.remove('has-sales');
      salesTickerText.textContent = 'Aguardando primeiras compras confirmadas...';
      return;
    }

    setTickerText(buildTickerText(items));
  } catch (error) {
    salesTicker.classList.remove('has-sales');
    salesTickerText.textContent = 'Compras recentes serão exibidas em instantes.';
  }
}

function listenSalesTickerStream() {
  if (!salesTicker || !window.EventSource) {
    return;
  }

  const slug = salesTicker.dataset.campaignSlug;
  const source = new EventSource(`/api/v1/campanhas/${slug}/esteira/stream`);

  source.addEventListener('pedido-pago', () => {
    loadSalesTicker();
  });

  source.addEventListener('error', () => {
    source.close();
  });
}

function openBuyerModal(event) {
  event.preventDefault();
  buyerModal.classList.add('is-open');
  buyerModal.setAttribute('aria-hidden', 'false');
  buyerForm.elements.whatsapp.focus();
}

function closeBuyerModal() {
  buyerModal.classList.remove('is-open');
  buyerModal.setAttribute('aria-hidden', 'true');
}

function renderBuyerLoading() {
  buyerResults.innerHTML = '<p class="buyer-empty">Consultando suas cotas...</p>';
}

function renderBuyerEmpty() {
  buyerResults.innerHTML = '<p class="buyer-empty">Nenhuma cota paga foi encontrada para este WhatsApp.</p>';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderBuyerResults(items) {
  if (!items.length) {
    renderBuyerEmpty();
    return;
  }

  buyerResults.innerHTML = items.map((item) => `
    <article class="buyer-card">
      <div>
        <span>${escapeHtml(item.dono_rifa)}</span>
        <h3>${escapeHtml(item.campanha.titulo)}</h3>
        <p>${item.quantidade_cotas} cota${item.quantidade_cotas === 1 ? '' : 's'} confirmada${item.quantidade_cotas === 1 ? '' : 's'}</p>
      </div>
      <strong>${escapeHtml(item.chance_label)}</strong>
    </article>
  `).join('');
}

async function consultBuyerTickets(event) {
  event.preventDefault();
  const formData = new FormData(buyerForm);
  const whatsapp = String(formData.get('whatsapp') || '').trim();

  renderBuyerLoading();

  try {
    const response = await fetch('/api/v1/comprador/consultar', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ whatsapp }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel consultar suas cotas.');
    }

    renderBuyerResults(Array.isArray(payload.data) ? payload.data : []);
  } catch (error) {
    buyerResults.innerHTML = `<p class="buyer-empty">${escapeHtml(error.message)}</p>`;
  }
}

renderNumbers();
updateTotals();
loadSalesTicker();
listenSalesTickerStream();
setInterval(loadSalesTicker, 30000);

openBuyerArea.addEventListener('click', openBuyerModal);
closeBuyerArea.addEventListener('click', closeBuyerModal);
buyerModal.addEventListener('click', (event) => {
  if (event.target === buyerModal) {
    closeBuyerModal();
  }
});
buyerForm.addEventListener('submit', consultBuyerTickets);
