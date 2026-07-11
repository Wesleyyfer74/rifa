const { Router } = require('express');
const adminProfileController = require('../../modules/admin-profile/admin-profile.controller');
const authController = require('../../modules/auth/auth.controller');
const campanhasController = require('../../modules/campanhas/campanhas.controller');
const dashboardController = require('../../modules/dashboard/dashboard.controller');
const historicoController = require('../../modules/historico/historico.controller');
const asaasController = require('../../modules/payments/asaas.controller');
const mercadoPagoOAuthController = require('../../modules/payments/mercado-pago-oauth.controller');
const pedidosController = require('../../modules/pedidos/pedidos.controller');
const rifinhasController = require('../../modules/rifinhas/rifinhas.controller');
const usuariosController = require('../../modules/usuarios-clientes/usuarios-clientes.controller');
const { authenticateAdmin } = require('../../middlewares/authenticate-admin');
const { uploadCampaignImage } = require('../../middlewares/upload-campaign-image');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/gateways/mercado-pago/callback', mercadoPagoOAuthController.callback);

router.use(authenticateAdmin);

router.get('/perfil', adminProfileController.show);
router.put('/perfil', adminProfileController.update);
router.get('/gateways/mercado-pago/status', mercadoPagoOAuthController.status);
router.post('/gateways/mercado-pago/connect', mercadoPagoOAuthController.connect);
router.delete('/gateways/mercado-pago', mercadoPagoOAuthController.disconnect);
router.get('/gateways/asaas/status', asaasController.status);
router.post('/gateways/asaas/connect', asaasController.connect);
router.post('/gateways/asaas/conta-propria', asaasController.connectOwn);
router.get('/gateways/asaas/saldo', asaasController.balance);
router.post('/gateways/asaas/saques', asaasController.withdraw);
router.delete('/gateways/asaas', asaasController.disconnect);
router.get('/dashboard/stats', dashboardController.stats);
router.get('/historico', historicoController.index);
router.post('/usuarios-clientes', usuariosController.create);
router.get('/usuarios-clientes/:id/campanhas', campanhasController.listByOwner);
router.get('/campanhas', campanhasController.listAdmin);
router.post('/campanhas', uploadCampaignImage.single('imagem'), campanhasController.create);
router.get('/campanhas/:id/verificar-disparo', campanhasController.verificarDisparo);
router.post('/campanhas/:id/disparar-whatsapp', campanhasController.dispararWhatsapp);
router.get('/campanhas/:id/compradores-stats', campanhasController.compradoresStats);
router.post('/campanhas/:id/sortear', campanhasController.sortearCampanha);
router.patch('/campanhas/:id/finalizar', campanhasController.finalizarCampanha);
router.put('/campanhas/:id', uploadCampaignImage.single('imagem'), campanhasController.update);
router.delete('/campanhas/:id', campanhasController.remove);
router.get('/rifinhas', rifinhasController.list);
router.post('/rifinhas', rifinhasController.create);
router.delete('/rifinhas/:id', rifinhasController.remove);
router.get('/pedidos', pedidosController.listAdmin);

module.exports = router;
