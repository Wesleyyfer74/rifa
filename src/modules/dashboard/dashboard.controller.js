const dashboardRepository = require('./dashboard.repository');

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

async function stats(req, res, next) {
  try {
    const data = await dashboardRepository.getStatsByAdminId(req.admin_id);

    return res.json({
      data: {
        campanhas_ativas: data.campanhas_ativas,
        pedidos_hoje: data.pedidos_hoje,
        receita_pendente: data.receita_pendente,
        receita_pendente_formatada: formatMoney(data.receita_pendente),
        cotas_vendidas: data.cotas_vendidas,
        cotas_vendidas_formatada: data.cotas_vendidas.toLocaleString('pt-BR'),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  stats,
};
