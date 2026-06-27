const paymentsService = require('./payments.service');

async function pagamento(req, res, next) {
  try {
    const result = await paymentsService.handleWebhook(req);
    return res.status(200).json({ data: result });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  pagamento,
};
