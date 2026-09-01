const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.db.connectionString,
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  // Erros em clientes ociosos no pool não devem derrubar o processo,
  // mas precisam ser visíveis nos logs.
  logger.error('Erro inesperado no pool do PostgreSQL', { error: err.message });
});

/**
 * Executa uma query simples usando o pool.
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Executa uma função dentro de uma transaction (BEGIN/COMMIT/ROLLBACK).
 * Use para qualquer operação que precise ser atômica — ex: registrar
 * uma movimentação + gravar o log de auditoria.
 *
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
