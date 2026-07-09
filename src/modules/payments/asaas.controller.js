const asaasService = require('./asaas.service');
const profileRepository = require('../admin-profile/admin-profile.repository');
const { HttpError } = require('../../utils/http-error');

async function status(req, res, next) {
  try {
    const admin = await profileRepository.findById(req.admin_id);

    if (!admin) {
      throw new HttpError(404, 'Administrador nao encontrado.');
    }

    return res.json({ data: asaasService.getConnectionStatus(admin) });
  } catch (error) {
    return next(error);
  }
}

async function connect(req, res, next) {
  try {
    const admin = await asaasService.connect({
      adminId: req.admin_id,
      body: req.body,
    });

    return res.json({ data: asaasService.getConnectionStatus(admin) });
  } catch (error) {
    return next(error);
  }
}

async function connectOwn(req, res, next) {
  try {
    const admin = await asaasService.connectOwnAccount({
      adminId: req.admin_id,
      apiKey: req.body.api_key || req.body.apiKey,
      environment: req.body.environment || req.body.ambiente,
    });

    return res.json({ data: asaasService.getConnectionStatus(admin) });
  } catch (error) {
    return next(error);
  }
}

async function disconnect(req, res, next) {
  try {
    const admin = await asaasService.disconnect(req.admin_id);
    return res.json({ data: asaasService.getConnectionStatus(admin) });
  } catch (error) {
    return next(error);
  }
}

async function balance(req, res, next) {
  try {
    const data = await asaasService.getBalance(req.admin_id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

async function withdraw(req, res, next) {
  try {
    const data = await asaasService.createPixWithdrawal({
      adminId: req.admin_id,
      value: req.body.valor || req.body.value,
      pixKey: req.body.pix_chave || req.body.pixKey,
      pixKeyType: req.body.pix_tipo || req.body.pixKeyType,
      description: req.body.descricao || req.body.description,
    });

    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  balance,
  connect,
  connectOwn,
  disconnect,
  status,
  withdraw,
};
