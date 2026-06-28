const { Router } = require('express');

const campanhasRoutes = require('./public/campanhas.routes');
const pedidosRoutes = require('./public/pedidos.routes');
const webhooksRoutes = require('./public/webhooks.routes');
const adminRoutes = require('./admin/admin.routes');

const router = Router();

router.use('/v1/campanhas', campanhasRoutes);
router.use('/v1/pedidos', pedidosRoutes);
router.use('/v1/campanha', campanhasRoutes);
router.use('/v1/pedido', pedidosRoutes);
router.use('/v1/webhooks', webhooksRoutes);
router.use('/v1/admin', adminRoutes);

module.exports = router;
