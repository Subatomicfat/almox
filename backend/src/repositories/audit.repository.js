const { query } = require('../config/database');

/**
 * Grava uma entrada de auditoria. Aceita um `client` opcional (de uma
 * transaction em andamento) para que o log seja gravado atomicamente
 * junto da operação que o originou — ex: criar uma movimentação e
 * seu registro de auditoria não devem "meio acontecer".
 */
async function log({ client, userId, action, table, recordId, oldValues, newValues, ip }) {
  const runner = client ? client.query.bind(client) : query;
  await runner(
    `INSERT INTO audit_log (user_id, action, table_affected, record_id, old_values, new_values, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId || null,
      action,
      table,
      recordId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ip || null
    ]
  );
}

async function findAll({ userId, dataInicio, dataFim, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];

  if (userId) { params.push(userId); conditions.push(`user_id = $${params.length}`); }
  if (dataInicio) { params.push(dataInicio); conditions.push(`timestamp >= $${params.length}`); }
  if (dataFim) { params.push(dataFim); conditions.push(`timestamp <= $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT a.*, u.nome AS user_nome FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.timestamp DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

module.exports = { log, findAll };
