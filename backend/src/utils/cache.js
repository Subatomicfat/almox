cconst { createClient } = require('redis');
const env = require('../config/env');
const logger = require('../utils/logger');

let client = null;
let available = false;

/**
 * Conecta ao Redis no boot da aplicação. Cache aqui é um "nice to have"
 * de performance, NUNCA uma dependência crítica: se o Redis cair ou
 * nem estiver configurado, a API continua funcionando normalmente
 * (só um pouco mais lenta, indo direto ao Postgres) em vez de derrubar
 * a requisição. Por isso todo erro é capturado e só loga um warning.
 */
async function connect() {
  if (client) return;
  client = createClient({
    url: env.redis.url,
    socket: {
      // Cache é opcional. Sem isso, o cliente do Redis tenta
      // reconectar automaticamente PARA SEMPRE (a cada ~500ms com
      // backoff) quando não encontra o servidor — o que inunda os
      // logs de produção quando REDIS_URL/REDIS_HOST simplesmente não
      // foi configurado na plataforma de deploy (cenário normal, não
      // um erro transitório de rede que valeria retry). Falha uma vez
      // e segue sem cache.
      reconnectStrategy: false
    }
  });

  let avisouUmaVez = false;
  client.on('error', (err) => {
    available = false;
    if (!avisouUmaVez) {
      avisouUmaVez = true;
      logger.warn('Redis indisponível — seguindo sem cache (sem retry automático).', { error: err.message });
    }
  });
  client.on('connect', () => { available = true; });

  try {
    await client.connect();
    available = true;
    logger.info('Conectado ao Redis para cache.');
  } catch (err) {
    available = false;
    logger.warn('Não foi possível conectar ao Redis no boot — seguindo sem cache.', { error: err.message });
  }
}

async function getJSON(key) {
  if (!available) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn('Falha ao ler do cache — ignorando.', { key, error: err.message });
    return null;
  }
}

async function setJSON(key, value, ttlSeconds) {
  if (!available) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    logger.warn('Falha ao escrever no cache — ignorando.', { key, error: err.message });
  }
}

async function bumpVersion(versionKey) {
  if (!available) return;
  try { await client.incr(versionKey); } catch { /* best-effort */ }
}

async function getVersion(versionKey) {
  if (!available) return '0';
  try { return (await client.get(versionKey)) || '0'; } catch { return '0'; }
}

/**
 * Padrão cache-aside: tenta ler do cache; se não tiver (ou o Redis
 * estiver fora do ar), executa `fetchFn` (a query real) e grava o
 * resultado no cache antes de devolver.
 */
async function withCache(key, ttlSeconds, fetchFn) {
  const cached = await getJSON(key);
  if (cached !== null) return cached;
  const fresh = await fetchFn();
  await setJSON(key, fresh, ttlSeconds);
  return fresh;
}

async function disconnect() {
  if (client && available) {
    try { await client.quit(); } catch { /* ignore */ }
  }
}

module.exports = { connect, disconnect, getJSON, setJSON, bumpVersion, getVersion, withCache, isAvailable: () => available };

