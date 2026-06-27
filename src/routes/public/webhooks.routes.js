const { Router } = require('express');
const webhooksController = require('../../modules/payments/webhooks.controller');

const router = Router();

router.post('/pagamento', webhooksController.pagamento);

module.exports = router;
