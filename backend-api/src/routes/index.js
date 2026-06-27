const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const { publicCors, adminCors } = require('../middlewares/cors.middleware');

const router = Router();

function notImplemented(feature) {
  return (req, res) => {
    res.status(501).json({
      error: {
        message: `${feature} ainda nao implementado nesta estrutura alvo.`,
        status: 501,
      },
    });
  };
}

/**
 * Rotas administrativas
 * Base path esperado no app principal: /admin
 *
 * Todas as rotas abaixo, exceto login/register, devem passar por autenticacao.
 */
const adminRouter = Router();

adminRouter.use(adminCors);

adminRouter.post('/login', notImplemented('admin.login'));
adminRouter.post('/register', notImplemented('admin.register'));

adminRouter.use(requireAuth);

adminRouter.get('/campanhas', notImplemented('admin.campanhas.index'));
adminRouter.post('/campanhas', notImplemented('admin.campanhas.create'));
adminRouter.get('/campanhas/:id', notImplemented('admin.campanhas.show'));
adminRouter.put('/campanhas/:id', notImplemented('admin.campanhas.update'));
adminRouter.delete('/campanhas/:id', notImplemented('admin.campanhas.delete'));

adminRouter.get('/rifinhas', notImplemented('admin.rifinhas.index'));
adminRouter.post('/rifinhas', notImplemented('admin.rifinhas.create'));
adminRouter.delete('/rifinhas/:id', notImplemented('admin.rifinhas.delete'));

adminRouter.get('/pedidos', notImplemented('admin.pedidos.index'));

/**
 * Rotas publicas da API
 * Base path esperado no app principal: /api/v1
 *
 * Estas rotas sao consumidas por landing pages externas e devem usar CORS.
 */
const publicApiRouter = Router();

publicApiRouter.use(publicCors);

publicApiRouter.get('/campanha/:slug', notImplemented('public.campanha.show'));
publicApiRouter.post('/pedido/criar', notImplemented('public.pedido.create'));
publicApiRouter.get('/pedido/:id', notImplemented('public.pedido.show'));

/**
 * Webhooks publicos de integracoes externas.
 * Devem ter validacao propria de assinatura/token do provedor.
 */
publicApiRouter.post('/webhooks/pagamento', notImplemented('public.webhooks.pagamento'));

router.use('/admin', adminRouter);
router.use('/api/v1', publicApiRouter);

module.exports = router;
