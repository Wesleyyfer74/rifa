function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.code === 'LIMIT_FILE_SIZE'
    ? 422
    : error.statusCode || error.status || 500;
  const message = error.code === 'LIMIT_FILE_SIZE'
    ? 'A imagem deve ter no maximo 5MB.'
    : error.message;

  return res.status(status).json({
    error: {
      message: status === 500 ? 'Erro interno do servidor.' : message,
      status,
    },
  });
}

module.exports = { errorHandler };
