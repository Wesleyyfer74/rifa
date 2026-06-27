function requireAuth(req, res, next) {
  const authHeader = req.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Token de autenticacao ausente.',
        status: 401,
      },
    });
  }

  // TODO: Validar JWT usando JWT_SECRET e anexar o usuario em req.user.
  return next();
}

module.exports = {
  requireAuth,
};
