const { env } = require('../../config/env');

const queue = [];
let processing = false;

function buildCampaignUrl(campanha) {
  return `${env.publicAppUrl.replace(/\/$/, '')}/rifa/${campanha.slug}`;
}

function buildMessage(campanha) {
  return [
    `Ola! Nova campanha no ar: ${campanha.titulo}.`,
    `Garanta sua cota com mais chances de ganhar aqui: ${buildCampaignUrl(campanha)}`,
  ].join(' ');
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

async function sendWhatsappMessage(job) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.log('[whatsapp-remarketing] Simulado:', {
      to: maskPhone(job.whatsapp),
      campanha_id: job.campanhaId,
      message: job.message,
    });
    return { simulated: true };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: job.whatsapp,
      text: job.message,
      campaign_id: job.campanhaId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar WhatsApp: HTTP ${response.status}`);
  }

  return response.json();
}

async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length) {
    const job = queue.shift();
    try {
      await sendWhatsappMessage(job);
    } catch (error) {
      console.error('[whatsapp-remarketing] Erro no envio:', {
        to: maskPhone(job.whatsapp),
        campanha_id: job.campanhaId,
        error: error.message,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  processing = false;
}

function enqueueCampaignRemarketing({ campanha, contatos }) {
  const message = buildMessage(campanha);
  const jobs = contatos.map((whatsapp) => ({
    whatsapp,
    campanhaId: campanha.id,
    message,
  }));

  queue.push(...jobs);
  setImmediate(processQueue);

  return {
    queued: jobs.length,
    message,
    integration_ready: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN),
  };
}

module.exports = {
  buildCampaignUrl,
  buildMessage,
  enqueueCampaignRemarketing,
};
