const { query } = require('../config/database');

async function findAll({ categoria, estoqueBaixo, busca, page = 1, limit = 20, sort = 'nome' } = {}) {
  const conditions = ['ativo = TRUE'];
  const params = [];

  if (categoria) { params.push(categoria); conditions.push(`categoria = $${params.length}`); }
  if (estoqueBaixo === true) { conditions.push('estoque_atual <= estoque_minimo'); }
  if (busca) {
    params.push(`%${busca.toLowerCase()}%`);
    conditions.push(`(LOWER(codigo) LIKE $${params.length} OR LOWER(nome) LIKE $${params.length})`);
  }

  const allowedSort = ['nome', 'codigo', 'estoque_atual', 'created_at'];
  const sortColumn = allowedSort.includes(sort) ? sort : 'nome';

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT * FROM products ${where} ORDER BY ${sortColumn} ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM products ${where}`,
    params.slice(0, params.length - 2)
  );
  return { data: rows, total: parseInt(countRows[0].count, 10), page, limit };
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByCodigo(codigo) {
  const { rows } = await query('SELECT * FROM products WHERE codigo = $1', [codigo]);
  return rows[0] || null;
}

async function create({ codigo, nome, categoria, unidade, estoqueMinimo, estoqueAtual }) {
  const { rows } = await query(
    `INSERT INTO products (codigo, nome, categoria, unidade, estoque_minimo, estoque_atual)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [codigo, nome, categoria, unidade, estoqueMinimo, estoqueAtual]
  );
  return rows[0];
}

async function update(id, { nome, categoria, unidade, estoqueMinimo }) {
  // estoque_atual NÃO é editável diretamente aqui de propósito — só muda
  // via movements, para que o saldo nunca perca rastreabilidade.
  const { rows } = await query(
    `UPDATE products SET nome = COALESCE($2, nome), categoria = COALESCE($3, categoria),
       unidade = COALESCE($4, unidade), estoque_minimo = COALESCE($5, estoque_minimo)
     WHERE id = $1 RETURNING *`,
    [id, nome, categoria, unidade, estoqueMinimo]
  );
  return rows[0] || null;
}

async function softDelete(id) {
  const { rows } = await query(
    `UPDATE products SET ativo = FALSE WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function estoqueBaixo() {
  const { rows } = await query('SELECT * FROM vw_estoque_baixo ORDER BY quantidade_faltante DESC');
  return rows;
}

module.exports = { findAll, findById, findByCodigo, create, update, softDelete, estoqueBaixo };
