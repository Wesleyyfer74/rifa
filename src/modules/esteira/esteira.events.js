const { EventEmitter } = require('events');

const esteiraEvents = new EventEmitter();
esteiraEvents.setMaxListeners(100);

function emitPedidoPago(campanhaSlug, payload) {
  esteiraEvents.emit(`pedido-pago:${campanhaSlug}`, payload);
}

function onPedidoPago(campanhaSlug, listener) {
  const eventName = `pedido-pago:${campanhaSlug}`;
  esteiraEvents.on(eventName, listener);

  return () => {
    esteiraEvents.off(eventName, listener);
  };
}

module.exports = {
  emitPedidoPago,
  onPedidoPago,
};
