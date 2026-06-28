const { Router } = require('express');
const authController = require('../../modules/auth/auth.controller');
const campanhasController = require('../../modules/campanhas/campanhas.controller');
const pedidosController = require('../../modules/pedidos/pedidos.controller');
const rifinhasController = require('../../modules/rifinhas/rifinhas.controller');
const usuariosController = require('../../modules/usuarios-clientes/usuarios-clientes.controller');
const { authenticateAdmin } = require('../../middlewares/authenticate-admin');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.use(authenticateAdmin);

router.post('/usuarios-clientes', usuariosController.create);
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
