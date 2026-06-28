function maskBuyerName(fullName) {
  const parts = String(fullName || 'Comprador').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Comprador';
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1].charAt(0).toUpperCase()}.` : 'S.';

  return `${firstName} ${lastInitial}`;
}

function calculatePercent(cotasCount, totalCotas) {
  if (!totalCotas || totalCotas <= 0) {
    return 0;
  }

  return Number(((cotasCount / totalCotas) * 100).toFixed(1));
}

function presentEsteiraPedido(pedido) {
  const totalCotas = pedido.campanha?.totalCotas || 0;
  const cotasCount = Array.isArray(pedido.cotasReservadas) ? pedido.cotasReservadas.length : 0;
  const percentual = calculatePercent(cotasCount, totalCotas);

  return {
    id: pedido.id,
    comprador: maskBuyerName(pedido.compradorNome),
    percentual,
    percentual_label: `${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
    cotas: cotasCount,
    timestamp: pedido.paidAt || pedido.updatedAt || pedido.createdAt,
  };
}

module.exports = {
  calculatePercent,
  maskBuyerName,
  presentEsteiraPedido,
};
