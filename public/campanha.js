const state = {
  campaign: null,
  selectedNumbers: new Set(),
  mode: 'random',
};

const els = {
  loading: document.querySelector('#campaignLoading'),
  error: document.querySelector('#campaignError'),
  errorText: document.querySelector('#campaignErrorText'),
  page: document.querySelector('#campaignPage'),
  image: document.querySelector('#campaignImage'),
  status: document.querySelector('#campaignStatus'),
  title: document.querySelector('#campaignTitle'),
  prize: document.querySelector('#campaignPrize'),
  description: document.querySelector('#campaignDescription'),
  price: document.querySelector('#campaignPrice'),
  total: document.querySelector('#campaignTotal'),
  available: document.querySelector('#campaignAvailable'),
  rules: document.querySelector('#quotaRules'),
  tickerText: document.querySelector('#salesTickerText'),
  copyShareLink: document.querySelector('#copyShareLink'),
  randomModeButton: document.querySelector('#randomModeButton'),
  manualModeButton: document.querySelector('#manualModeButton'),
  randomMode: document.querySelector('#randomMode'),
  manualMode: document.querySelector('#manualMode'),
  randomQuantity: document.querySelector('#randomQuantity'),
  quickAmounts: document.querySelector('#quickAmounts'),
  manualNumbers: document.querySelector('#manualNumbers'),
  numbersGrid: document.querySelector('#numbersGrid'),
  summaryCount: document.querySelector('#summaryCount'),
  summaryTotal: document.querySelector('#summaryTotal'),
  form: document.querySelector('#orderForm'),
  result: document.querySelector('#orderResult'),
  campaignRules: document.querySelector('#campaignRules'),
  paymentInstructions: document.querySelector('#paymentInstructions'),
  supportContact: document.querySelector('#supportContact'),
};

function getSlugFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getMetadata() {
  return state.campaign?.metadata && typeof state.campaign.metadata === 'object'
    ? state.campaign.metadata
    : {};
}

function getRules() {
  const metadata = getMetadata();
  const total = Number(state.campaign?.total_cotas || 1);

  return {
    min: Number(metadata.min_cotas_por_pedido || 1),
    max: Math.min(Number(metadata.max_cotas_por_pedido || 100), total),
    expires: Number(metadata.reserva_expira_minutos || 15),
  };
}

function getSelectedManualNumbers() {
  const typed = els.manualNumbers.value
    .split(/[,\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

  return [...new Set([...state.selectedNumbers, ...typed])].sort((a, b) => a - b);
}

function getCurrentQuantity() {
  if (state.mode === 'manual') {
    return getSelectedManualNumbers().length;
  }

  return Number(els.randomQuantity.value || 0);
}

function updateSummary() {
  const count = getCurrentQuantity();
  const value = Number(state.campaign?.valor_cota || 0) * count;

  els.summaryCount.textContent = String(count);
  els.summaryTotal.textContent = formatMoney(value);
}

function setMode(mode) {
  state.mode = mode;
  els.randomMode.classList.toggle('hidden', mode !== 'random');
  els.manualMode.classList.toggle('hidden', mode !== 'manual');
  els.randomModeButton.classList.toggle('active', mode === 'random');
  els.manualModeButton.classList.toggle('active', mode === 'manual');
  updateSummary();
}

function showError(message) {
  els.loading.classList.add('hidden');
  els.page.classList.add('hidden');
  els.error.classList.remove('hidden');
  els.errorText.textContent = message;
}

function showPage() {
  els.loading.classList.add('hidden');
  els.error.classList.add('hidden');
  els.page.classList.remove('hidden');
}

function buildQuickAmounts() {
  const rules = getRules();
  const values = [rules.min, 5, 10, 25, 50, 100, rules.max]
    .filter((value) => value >= rules.min && value <= rules.max);
  const uniqueValues = [...new Set(values)];

  els.quickAmounts.innerHTML = uniqueValues.map((value) => (
    `<button type="button" data-amount="${value}">+${value}</button>`
  )).join('');

  els.quickAmounts.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      els.randomQuantity.value = button.dataset.amount;
      updateSummary();
    });
  });
}

function renderNumbersGrid() {
  const campaign = state.campaign;
  const total = Number(campaign.total_cotas || 0);
  const occupied = new Set(campaign.numeros_ocupados || []);

  if (total > 1000) {
    els.numbersGrid.innerHTML = `
      <div class="state-card">
        <strong>Rifa com muitas cotas</strong>
        <span>Digite os numeros desejados no campo acima ou use cotas aleatorias.</span>
      </div>
    `;
    return;
  }

  const buttons = [];
  for (let numero = 1; numero <= total; numero += 1) {
    const unavailable = occupied.has(numero);
    buttons.push(`
      <button class="number-button${unavailable ? ' unavailable' : ''}" type="button" data-number="${numero}" ${unavailable ? 'disabled' : ''}>
        ${String(numero).padStart(3, '0')}
      </button>
    `);
  }

  els.numbersGrid.innerHTML = buttons.join('');
  els.numbersGrid.querySelectorAll('.number-button:not(.unavailable)').forEach((button) => {
    button.addEventListener('click', () => {
      const numero = Number(button.dataset.number);

      if (state.selectedNumbers.has(numero)) {
        state.selectedNumbers.delete(numero);
        button.classList.remove('selected');
      } else {
        state.selectedNumbers.add(numero);
        button.classList.add('selected');
      }

      updateSummary();
    });
  });
}

function renderCampaign(campaign) {
  const metadata = campaign.metadata || {};
  const rules = getRules();
  const resumo = campaign.resumo_cotas || {};

  document.title = `${campaign.titulo} | Rifa Premium`;
  els.image.src = campaign.imagem_url || '/hero-raffle.png';
  els.image.alt = campaign.titulo;
  els.status.textContent = campaign.status;
  els.title.textContent = campaign.titulo;
  els.prize.textContent = metadata.premio_principal || 'Premio especial';
  els.description.textContent = campaign.descricao || 'Escolha suas cotas e participe desta campanha.';
  els.price.textContent = formatMoney(campaign.valor_cota);
  els.total.textContent = Number(campaign.total_cotas || 0).toLocaleString('pt-BR');
  els.available.textContent = Number(resumo.disponiveis || 0).toLocaleString('pt-BR');
  els.rules.textContent = `${rules.min} a ${rules.max} cotas por pedido | reserva ${rules.expires} min`;
  els.randomQuantity.min = String(rules.min);
  els.randomQuantity.max = String(rules.max);
  els.randomQuantity.value = String(rules.min);
  els.campaignRules.textContent = campaign.regulamento || 'Regulamento nao informado.';
  els.paymentInstructions.textContent = metadata.instrucoes_pagamento || `Reserve suas cotas e pague dentro de ${rules.expires} minutos para confirmar.`;
  els.supportContact.textContent = metadata.whatsapp_suporte
    ? `WhatsApp de suporte: ${metadata.whatsapp_suporte}`
    : 'Use o contato oficial divulgado pelo organizador da campanha.';

  buildQuickAmounts();
  renderNumbersGrid();
  updateSummary();
  showPage();
}

function buildTickerText(items) {
  return items
    .map((item) => `${item.comprador} adquiriu ${Number(item.percentual || 0).toFixed(1)}% de cotas`)
    .join(' > ');
}

async function loadSalesTicker(slug) {
  try {
    const response = await fetch(`/api/v1/campanhas/${slug}/esteira`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error('Falha ao carregar esteira');

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];
    els.tickerText.textContent = items.length
      ? buildTickerText(items)
      : 'Aguardando primeiras compras confirmadas...';
  } catch (error) {
    els.tickerText.textContent = 'Compras recentes serao exibidas em instantes.';
  }
}

function validateOrderPayload(payload) {
  const rules = getRules();
  const quantity = payload.quantidade_cotas || payload.cotas?.length || 0;

  if (quantity < rules.min || quantity > rules.max) {
    throw new Error(`Escolha entre ${rules.min} e ${rules.max} cota(s).`);
  }
}

function renderOrderResult(html, type = 'success') {
  els.result.classList.remove('hidden', 'error');
  if (type === 'error') els.result.classList.add('error');
  els.result.innerHTML = html;
}

async function submitOrder(event) {
  event.preventDefault();
  els.result.classList.add('hidden');

  const formData = new FormData(els.form);
  const payload = {
    campanha_id: state.campaign.id,
    nome_comprador: formData.get('nome'),
    whatsapp_comprador: formData.get('whatsapp'),
    compradorEmail: formData.get('email') || undefined,
  };

  if (state.mode === 'manual') {
    payload.cotas = getSelectedManualNumbers();
  } else {
    payload.quantidade_cotas = Number(els.randomQuantity.value || 0);
  }

  try {
    validateOrderPayload(payload);

    const response = await fetch('/api/v1/pedidos/reservar', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Nao foi possivel reservar suas cotas.');
    }

    const cotas = result.data.cotas.map((numero) => String(numero).padStart(3, '0')).join(', ');
    renderOrderResult(`
      <strong>Reserva criada com sucesso.</strong><br>
      Pedido: ${escapeHtml(result.data.id)}<br>
      Cotas: ${escapeHtml(cotas)}<br>
      Total: ${formatMoney(result.data.valor_total)}<br>
      Chance: ${escapeHtml(result.data.chance_percentual_label)}<br>
      Status: aguardando pagamento Pix.
    `);

    await loadCampaign();
  } catch (error) {
    renderOrderResult(escapeHtml(error.message), 'error');
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    els.copyShareLink.textContent = 'Link copiado';
    setTimeout(() => {
      els.copyShareLink.textContent = 'Copiar link';
    }, 1800);
  } catch (error) {
    window.prompt('Copie o link da campanha:', window.location.href);
  }
}

async function loadCampaign() {
  const slug = getSlugFromPath();

  try {
    const response = await fetch(`/api/v1/campanhas/${slug}`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Campanha nao encontrada.');
    }

    state.campaign = payload.data;
    state.selectedNumbers.clear();
    renderCampaign(payload.data);
    loadSalesTicker(slug);
  } catch (error) {
    showError(error.message);
  }
}

els.randomModeButton.addEventListener('click', () => setMode('random'));
els.manualModeButton.addEventListener('click', () => setMode('manual'));
els.randomQuantity.addEventListener('input', updateSummary);
els.manualNumbers.addEventListener('input', updateSummary);
els.form.addEventListener('submit', submitOrder);
els.copyShareLink.addEventListener('click', copyShareLink);

loadCampaign();
setInterval(() => loadSalesTicker(getSlugFromPath()), 30000);
