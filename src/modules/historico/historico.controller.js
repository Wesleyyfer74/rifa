const historicoRepository = require('./historico.repository');

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

async function index(req, res, next) {
  try {
    const historico = await historicoRepository.getHistoricoByAdminId(req.admin_id);

    return res.json({
      data: {
        campanhas_antigas: historico.campanhasAntigas.map((campanha) => ({
          id: campanha.id,
          titulo: campanha.titulo,
          slug: campanha.slug,
          status: campanha.status,
          imagem_url: campanha.imagem_url,
          total_cotas: Number(campanha.total_cotas || 0),
          valor_cota: Number(campanha.valor_cota || 0),
          data_sorteio: campanha.data_sorteio,
          pedidos_pagos: Number(campanha.pedidos_pagos || 0),
          receita_total: Number(campanha.receita_total || 0),
          receita_total_formatada: formatMoney(campanha.receita_total),
          cotas_vendidas: Number(campanha.cotas_vendidas || 0),
          criado_em: campanha.created_at,
          atualizado_em: campanha.updated_at,
        })),
        clientes_antigos: historico.clientesAntigos.map((cliente) => ({
          nome: cliente.nome,
          whatsapp: cliente.whatsapp,
          total_gasto_sistema: Number(cliente.total_gasto_sistema || 0),
          total_gasto_sistema_formatado: formatMoney(cliente.total_gasto_sistema),
          quantidade_campanhas_participou: Number(cliente.quantidade_campanhas_participou || 0),
          total_cotas_compradas: Number(cliente.total_cotas_compradas || 0),
          ultimo_pedido_em: cliente.ultimo_pedido_em,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  index,
};
