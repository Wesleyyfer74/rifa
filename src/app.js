const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const path = require('path');

const apiRoutes = require('./routes');
const { errorHandler } = require('./middlewares/error-handler');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
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
