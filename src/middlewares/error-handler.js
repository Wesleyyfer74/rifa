function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.statusCode || error.status || 500;

  return res.status(status).json({
    error: {
      message: status === 500 ? 'Erro interno do servidor.' : error.message,
      status,
    },
  });
}

module.exports = { errorHandler };
