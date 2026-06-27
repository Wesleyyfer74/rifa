require('dotenv').config();

const app = require('./src/app');
const { env, validateRuntimeEnv } = require('./src/config/env');

validateRuntimeEnv();

app.listen(env.port, () => {
  console.log(`Rifa Do Cipriano API rodando na porta ${env.port}`);
});
