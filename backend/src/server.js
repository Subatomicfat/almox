const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');
const cache = require('./utils/cache');
const logger = require('./utils/logger');

let server;

(async () => {
  await cache.connect(); // não bloqueia o boot se o Redis estiver fora do ar
  server = app.listen(env.port, () => {
    logger.info(`ALMOX//CTRL API rodando na porta ${env.port} (${env.nodeEnv})`);
  });
})();

// Encerra conexões abertas com o banco e o Redis antes de finalizar o
// processo — evita "connection terminated unexpectedly" em deploys/restarts.
async function shutdown(signal) {
  logger.info(`Recebido ${signal}. Encerrando graciosamente...`);
  server.close(async () => {
    await pool.end();
    await cache.disconnect();
    logger.info('Servidor, pool do banco e conexão Redis encerrados.');
    process.exit(0);
  });

  // Failsafe: força saída se o shutdown gracioso demorar demais.
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: reason instanceof Error ? reason.message : reason });
});
