const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const path = require('path');

const apiRoutes = require('./routes');
const { env } = require('./config/env');
const { errorHandler } = require('./middlewares/error-handler');

const app = express();
app.set('trust proxy', true);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsAllowedOrigins.length === 0 || env.corsAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem nao permitida pelo CORS.'));
  },
};

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'rifa-headless-api' });
});

app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/painel', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'painel.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(errorHandler);

module.exports = app;
