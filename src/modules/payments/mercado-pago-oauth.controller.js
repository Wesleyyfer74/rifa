const oauthService = require('./mercado-pago-oauth.service');
const profileRepository = require('../admin-profile/admin-profile.repository');
const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');

function redirectToPanel(res, status, message) {
  const url = new URL('/painel', env.publicAppUrl || 'http://localhost:3000');
  url.searchParams.set('gateway', 'mercado_pago');
  url.searchParams.set('status', status);
  if (message) url.searchParams.set('message', message);
  return res.redirect(url.pathname + url.search);
}

async function status(req, res, next) {
  try {
    const admin = await profileRepository.findById(req.admin_id);

    if (!admin) {
      throw new HttpError(404, 'Administrador nao encontrado.');
    }

    return res.json({
      data: oauthService.getConnectionStatus(admin),
    });
  } catch (error) {
    return next(error);
  }
}

async function connect(req, res, next) {
  try {
    return res.json({
      data: {
        authorization_url: oauthService.buildAuthorizationUrl(req.admin_id),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function callback(req, res, next) {
  try {
    await oauthService.connectFromCallback({
      code: req.query.code,
      state: req.query.state,
    });

    return redirectToPanel(res, 'connected');
  } catch (error) {
    return redirectToPanel(res, 'error', error.message);
  }
}

async function disconnect(req, res, next) {
  try {
    const admin = await oauthService.disconnect(req.admin_id);

    return res.json({
      data: oauthService.getConnectionStatus(admin),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  callback,
  connect,
  disconnect,
  status,
};
