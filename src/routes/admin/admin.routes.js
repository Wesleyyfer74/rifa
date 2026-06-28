const { Router } = require('express');
const campanhasController = require('../../modules/campanhas/campanhas.controller');
const pedidosController = require('../../modules/pedidos/pedidos.controller');
const usuariosController = require('../../modules/usuarios-clientes/usuarios-clientes.controller');

const router = Router();

router.post('/usuarios-clientes', usuariosController.create);
router.get('/usuarios-clientes/:id/campanhas', campanhasController.listByOwner);
router.post('/campanhas', campanhasController.create);
router.get('/pedidos', pedidosController.listAdmin);

module.exports = router;
