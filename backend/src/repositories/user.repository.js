const { query } = require('../config/database');

async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    'SELECT id, nome, email, role, departamento, ativo, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function findAll({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { rows } = await query(
    `SELECT id, nome, email, role, departamento, ativo, created_at, updated_at
     FROM users ORDER BY nome ASC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: countRows } = await query('SELECT COUNT(*) FROM users');
  return { data: rows, total: parseInt(countRows[0].count, 10), page, limit };
}

async function create({ nome, email, senhaHash, role, departamento }) {
  const { rows } = await query(
    `INSERT INTO users (nome, email, senha_hash, role, departamento)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, email, role, departamento, ativo, created_at, updated_at`,
    [nome, email, senhaHash, role, departamento || null]
  );
  return rows[0];
}

async function update(id, { nome, role, departamento, ativo }) {
  const { rows } = await query(
    `UPDATE users SET nome = COALESCE($2, nome), role = COALESCE($3, role),
       departamento = COALESCE($4, departamento), ativo = COALESCE($5, ativo)
     WHERE id = $1
     RETURNING id, nome, email, role, departamento, ativo, created_at, updated_at`,
    [id, nome, role, departamento, ativo]
  );
  return rows[0] || null;
}

// Exclusão de usuário é sempre soft delete: preserva a integridade
// referencial com movements/audit_log (que apontam para user_id).
async function softDelete(id) {
  const { rows } = await query(
    `UPDATE users SET ativo = FALSE WHERE id = $1
     RETURNING id, nome, email, role, departamento, ativo`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findByEmail, findById, findAll, create, update, softDelete };
