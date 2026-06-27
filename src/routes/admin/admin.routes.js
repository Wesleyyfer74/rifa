const { Router } = require('express');
const campanhasController = require('../../modules/campanhas/campanhas.controller');
const usuariosController = require('../../modules/usuarios-clientes/usuarios-clientes.controller');

const router = Router();

router.post('/usuarios-clientes', usuariosController.create);
router.get('/usuarios-clientes/:id/campanhas', campanhasController.listByOwner);
router.post('/campanhas', campanhasController.create);

module.exports = router;
