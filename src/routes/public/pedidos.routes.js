const { Router } = require('express');
const pedidosController = require('../../modules/pedidos/pedidos.controller');

const router = Router();

router.post('/reservar', pedidosController.reservar);
router.post('/criar', pedidosController.reservar);
router.get('/status/:pedido_id', pedidosController.getStatus);
router.post('/', pedidosController.create);
router.get('/:id', pedidosController.getById);

module.exports = router;
