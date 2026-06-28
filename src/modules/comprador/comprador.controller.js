const compradorRepository = require('./comprador.repository');
const { HttpError } = require('../../utils/http-error');

function formatPercent(value) {
  const number = Number(value || 0);

  return Number(number.toFixed(2));
}

async function consultar(req, res, next) {
  try {
    const whatsapp = compradorRepository.normalizeWhatsapp(req.body?.whatsapp);

    if (!whatsapp || whatsapp.length < 8 || whatsapp.length > 15) {
      throw new HttpError(422, 'Informe um numero de WhatsApp valido.');
    }

    const rows = await compradorRepository.findPaidCampaignsByWhatsapp(whatsapp);

    return res.json({
      data: rows.map((row) => ({
        dono_rifa: row.dono_nome,
        campanha: {
          id: row.campanha_id,
          titulo: row.campanha_titulo,
          slug: row.campanha_slug,
          total_cotas: Number(row.total_cotas),
        },
        quantidade_cotas: Number(row.quantidade_cotas || 0),
        chance_percentual: formatPercent(row.chance_percentual),
        chance_label: `${formatPercent(row.chance_percentual).toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}%`,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  consultar,
};
