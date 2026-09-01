const { query } = require('../config/database');

async function findAll({ status, tipo, localizacao, page = 1, limit = 20 } = {}) {
  const conditions = ['ativo = TRUE'];
  const params = [];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (tipo) { params.push(`%${tipo.toLowerCase()}%`); conditions.push(`LOWER(tipo) LIKE $${params.length}`); }
  if (localizacao) { params.push(`%${localizacao.toLowerCase()}%`); conditions.push(`LOWER(localizacao) LIKE $${params.length}`); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM assets ${where} ORDER BY nome ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM assets WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByCodigo(codigo) {
  const { rows } = await query('SELECT * FROM assets WHERE codigo = $1', [codigo]);
  return rows[0] || null;
}

async function create({ codigo, nome, tipo, localizacao, status }) {
  const { rows } = await query(
    `INSERT INTO assets (codigo, nome, tipo, localizacao, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [codigo, nome, tipo, localizacao, status || 'disponivel']
  );
  return rows[0];
}

async function update(id, { nome, tipo, localizacao, status }) {
  const { rows } = await query(
    `UPDATE assets SET nome = COALESCE($2, nome), tipo = COALESCE($3, tipo),
       localizacao = COALESCE($4, localizacao), status = COALESCE($5, status)
     WHERE id = $1 RETURNING *`,
    [id, nome, tipo, localizacao, status]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findByCodigo, create, update };
