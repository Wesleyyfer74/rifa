const { Router } = require('express');
const campanhasController = require('../../modules/campanhas/campanhas.controller');
const pedidosController = require('../../modules/pedidos/pedidos.controller');
const rifinhasController = require('../../modules/rifinhas/rifinhas.controller');
const usuariosController = require('../../modules/usuarios-clientes/usuarios-clientes.controller');

const router = Router();

router.post('/usuarios-clientes', usuariosController.create);
router.post('/register', usuariosController.create);
router.post('/login', usuariosController.login);
router.get('/usuarios-clientes/:id/campanhas', campanhasController.listByOwner);
router.get('/campanhas', campanhasController.listAdmin);
router.post('/campanhas', campanhasController.create);
router.put('/campanhas/:id', campanhasController.update);
router.delete('/campanhas/:id', campanhasController.remove);
router.get('/rifinhas', rifinhasController.list);
router.post('/rifinhas', rifinhasController.create);
router.delete('/rifinhas/:id', rifinhasController.remove);
router.get('/pedidos', pedidosController.listAdmin);

module.exports = router;
