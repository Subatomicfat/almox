const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');
const cache = require('./utils/cache');
const logger = require('./utils/logger');

let server;

(async () => {
  // Liga isso definindo RUN_MIGRATIONS_ON_BOOT=true nas variáveis de
  // ambiente da plataforma de deploy — pensado para plataformas cujo
  // plano gratuito não dá acesso a um Shell/terminal (ex: Render free
  // tier), onde não tem como rodar `npm run migrate`/`npm run seed`
  // manualmente. Depois que aparecer "Migration/seed no boot concluídos"
  // nos logs, é seguro (e recomendado) apagar essa variável — tanto a
  // migration quanto o seed são seguros de rodar de novo por engano
  // (a migration falha graciosamente se as tabelas já existirem; o
  // seed não duplica o usuário admin), mas não custa nada economizar
  // esse tempinho de boot depois da primeira vez.
  if (process.env.RUN_MIGRATIONS_ON_BOOT === 'true') {
    logger.info('RUN_MIGRATIONS_ON_BOOT=true — aplicando migration e seed antes de subir o servidor...');
    try {
      await require('../db/migrate')();
    } catch (err) {
      logger.warn('Migration no boot terminou com erro (pode ser normal se já rodou antes)', { error: err.message });
    }
    try {
      await require('../db/seed')();
    } catch (err) {
      logger.warn('Seed no boot terminou com erro', { error: err.message });
    }
    logger.info('Migration/seed no boot concluídos.');
  }

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
