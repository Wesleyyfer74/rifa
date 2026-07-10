const state = {
  campaign: null,
};

const MIN_ORDER_VALUE = 5;
const QUOTA_PACKS = [5, 10, 20, 50, 100];

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
  randomQuantity: document.querySelector('#randomQuantity'),
  quotaDisplay: document.querySelector('#quotaDisplay'),
  decreaseQuota: document.querySelector('#decreaseQuota'),
  increaseQuota: document.querySelector('#increaseQuota'),
  quickAmounts: document.querySelector('#quickAmounts'),
  summaryCount: document.querySelector('#summaryCount'),
  summaryTotal: document.querySelector('#summaryTotal'),
  form: document.querySelector('#orderForm'),
  result: document.querySelector('#orderResult'),
  campaignRules: document.querySelector('#campaignRules'),
  paymentInstructions: document.querySelector('#paymentInstructions'),
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

function isFreeCampaign() {
  const metadata = getMetadata();
  return metadata.tipo_campanha === 'gratuita'
    || metadata.tipo_campanha === 'gratis'
    || metadata.sem_fins_lucrativos === true
    || Number(state.campaign?.valor_cota || 0) === 0;
}

function getRules() {
  const metadata = getMetadata();
  const total = Number(state.campaign?.total_cotas || 1);
  const quotaValue = Number(state.campaign?.valor_cota || 0);
  const free = isFreeCampaign();
  const minByAmount = !free && quotaValue > 0 ? Math.ceil(MIN_ORDER_VALUE / quotaValue) : 1;

  return {
    min: Math.max(Number(metadata.min_cotas_por_pedido || 1), minByAmount),
    max: Math.min(Number(metadata.max_cotas_por_pedido || 100), total),
    expires: Number(metadata.reserva_expira_minutos || 15),
    minValue: free ? 0 : MIN_ORDER_VALUE,
  };
}

function getCurrentQuantity() {
  return Number(els.randomQuantity.value || 0);
}

function clampQuantity(value) {
  const rules = getRules();
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return rules.min;
  }

  return Math.min(Math.max(Math.trunc(parsed), rules.min), rules.max);
}

function setQuantity(value) {
  const quantity = clampQuantity(value);
  els.randomQuantity.value = String(quantity);
  updateSummary();
}

function updateSummary() {
  const count = clampQuantity(getCurrentQuantity());
  const value = Number(state.campaign?.valor_cota || 0) * count;

  if (els.randomQuantity.value !== String(count)) {
    els.randomQuantity.value = String(count);
  }

  els.quotaDisplay.textContent = count.toLocaleString('pt-BR');
  els.summaryCount.textContent = String(count);
  els.summaryTotal.textContent = formatMoney(value);
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
  const values = [rules.min, ...QUOTA_PACKS, rules.max]
    .filter((value) => value >= rules.min && value <= rules.max);
  const uniqueValues = [...new Set(values)];

  els.quickAmounts.innerHTML = uniqueValues.map((value) => (
    `<button type="button" data-amount="${value}">+${value}</button>`
  )).join('');

  els.quickAmounts.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      setQuantity(button.dataset.amount);
    });
  });
}

function renderCampaign(campaign) {
  const metadata = campaign.metadata || {};
  const rules = getRules();
  const resumo = campaign.resumo_cotas || {};
  const free = isFreeCampaign();

  document.title = `${campaign.titulo} | Rifa Premium`;
  els.image.src = campaign.imagem_url || '/hero-raffle.png';
  els.image.alt = campaign.titulo;
  els.status.textContent = campaign.status;
  els.title.textContent = campaign.titulo;
  els.prize.textContent = metadata.premio_principal || 'Premio especial';
  els.description.textContent = campaign.descricao || (free
    ? 'Adquira sua cota gratuita e participe deste sorteio sem fins lucrativos.'
    : 'Escolha suas cotas e participe desta campanha.');
  els.price.textContent = free ? 'Gratis' : formatMoney(campaign.valor_cota);
  els.total.textContent = Number(campaign.total_cotas || 0).toLocaleString('pt-BR');
  els.available.textContent = Number(resumo.disponiveis || 0).toLocaleString('pt-BR');
  els.rules.textContent = free
    ? `${rules.min} a ${rules.max} cotas por participacao | sem pagamento`
    : `${rules.min} a ${rules.max} cotas por pedido | minimo ${formatMoney(rules.minValue)} | reserva ${rules.expires} min`;
  els.randomQuantity.min = String(rules.min);
  els.randomQuantity.max = String(rules.max);
  setQuantity(rules.min);
  els.campaignRules.textContent = campaign.regulamento || 'Regulamento nao informado.';
  els.paymentInstructions.textContent = metadata.instrucoes_pagamento || (free
    ? 'Sorteio gratuito e sem fins lucrativos. Suas cotas sao confirmadas ao enviar seus dados.'
    : `Reserve suas cotas e pague dentro de ${rules.expires} minutos para confirmar.`);

  document.querySelector('.hero-actions .btn-gold').textContent = free ? 'Participar agora' : 'Comprar agora';
  document.querySelector('.checkout-card h2').textContent = free ? 'Confirmar participacao' : 'Finalizar reserva';
  document.querySelector('#orderForm button[type="submit"]').textContent = free ? 'Garantir cota gratis' : 'Reservar cotas';
  document.querySelector('#regulamento article:last-child h2').textContent = free ? 'Participacao gratuita' : 'Pagamento';

  buildQuickAmounts();
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
      : (isFreeCampaign() ? 'Aguardando primeiras participacoes confirmadas...' : 'Aguardando primeiras compras confirmadas...');
  } catch (error) {
    els.tickerText.textContent = 'Compras recentes serao exibidas em instantes.';
  }
}

function validateOrderPayload(payload) {
  const rules = getRules();
  const quantity = payload.quantidade_cotas || 0;
  const free = isFreeCampaign();

  if (quantity < rules.min || quantity > rules.max) {
    throw new Error(free
      ? `Escolha entre ${rules.min} e ${rules.max} cota(s).`
      : `Escolha entre ${rules.min} e ${rules.max} cota(s). Compra minima de ${formatMoney(rules.minValue)}.`);
  }

  const total = Number(state.campaign?.valor_cota || 0) * quantity;
  if (!free && total < rules.minValue) {
    throw new Error(`A compra minima e de ${formatMoney(rules.minValue)}.`);
  }
}

function renderOrderResult(html, type = 'success') {
  els.result.classList.remove('hidden', 'error');
  if (type === 'error') els.result.classList.add('error');
  els.result.innerHTML = html;
}

async function copyPixPayload(payload, button) {
  try {
    await navigator.clipboard.writeText(payload);
    button.textContent = 'PIX copiado';
    setTimeout(() => {
      button.textContent = 'Copiar PIX copia e cola';
    }, 1800);
  } catch (error) {
    window.prompt('Copie o PIX:', payload);
  }
}

function buildPaymentResult(data) {
  if (data.tipo_campanha === 'gratuita' || Number(data.valor_total || 0) === 0) {
    return `
      <strong>Participacao confirmada com sucesso.</strong><br>
      Pedido: ${escapeHtml(data.id)}<br>
      Cotas garantidas: ${Number(data.quantidade_cotas || 0).toLocaleString('pt-BR')}<br>
      Chance: ${escapeHtml(data.chance_percentual_label)}<br>
      <span class="payment-warning">Sorteio gratuito e sem fins lucrativos. Nenhum pagamento e necessario.</span>
    `;
  }

  const pixPayload = data.pix_copia_cola || '';
  const qrCode = data.pix_qr_code || '';
  const qrCodeSrc = qrCode.startsWith('data:')
    ? qrCode
    : `data:image/png;base64,${qrCode}`;

  if (!pixPayload || !qrCode) {
    return `
      <strong>Reserva criada com sucesso.</strong><br>
      Pedido: ${escapeHtml(data.id)}<br>
      Quantidade de cotas: ${Number(data.quantidade_cotas || 0).toLocaleString('pt-BR')}<br>
      Total: ${formatMoney(data.valor_total)}<br>
      Chance: ${escapeHtml(data.chance_percentual_label)}<br>
      <span class="payment-warning">Gateway PIX ainda nao configurado. Ative o Mercado Pago para gerar QR Code automaticamente.</span>
    `;
  }

  return `
    <strong>PIX gerado com sucesso.</strong><br>
    Pedido: ${escapeHtml(data.id)}<br>
    Quantidade de cotas: ${Number(data.quantidade_cotas || 0).toLocaleString('pt-BR')}<br>
    Total: ${formatMoney(data.valor_total)}<br>
    Chance: ${escapeHtml(data.chance_percentual_label)}
    <div class="pix-box">
      <img src="${escapeHtml(qrCodeSrc)}" alt="QR Code PIX">
      <label>
        <span>PIX copia e cola</span>
        <textarea readonly>${escapeHtml(pixPayload)}</textarea>
      </label>
      <button id="copyPixPayload" class="btn btn-gold btn-full" type="button">Copiar PIX copia e cola</button>
    </div>
  `;
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
    quantidade_cotas: clampQuantity(els.randomQuantity.value),
  };

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

    renderOrderResult(buildPaymentResult(result.data));

    const copyPixButton = document.querySelector('#copyPixPayload');
    if (copyPixButton && result.data.pix_copia_cola) {
      copyPixButton.addEventListener('click', () => copyPixPayload(result.data.pix_copia_cola, copyPixButton));
    }

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
    renderCampaign(payload.data);
    loadSalesTicker(slug);
  } catch (error) {
    showError(error.message);
  }
}

els.decreaseQuota.addEventListener('click', () => setQuantity(getCurrentQuantity() - 1));
els.increaseQuota.addEventListener('click', () => setQuantity(getCurrentQuantity() + 1));
els.randomQuantity.addEventListener('input', updateSummary);
els.randomQuantity.addEventListener('blur', () => setQuantity(els.randomQuantity.value));
els.form.addEventListener('submit', submitOrder);
els.copyShareLink.addEventListener('click', copyShareLink);

loadCampaign();
setInterval(() => loadSalesTicker(getSlugFromPath()), 30000);
