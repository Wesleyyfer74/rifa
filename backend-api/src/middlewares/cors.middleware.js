const cors = require('cors');

function parseOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsMiddleware({ allowEmptyOrigin = false } = {}) {
  const allowedOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);

  return cors({
    origin(origin, callback) {
      if (!origin && allowEmptyOrigin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origem nao permitida pelo CORS.'));
    },
    credentials: true,
  });
}

const publicCors = buildCorsMiddleware({ allowEmptyOrigin: true });
const adminCors = buildCorsMiddleware({ allowEmptyOrigin: true });

module.exports = {
  publicCors,
  adminCors,
};
