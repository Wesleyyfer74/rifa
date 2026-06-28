const { Router } = require('express');
const compradorController = require('../../modules/comprador/comprador.controller');

const router = Router();

router.post('/consultar', compradorController.consultar);

module.exports = router;
