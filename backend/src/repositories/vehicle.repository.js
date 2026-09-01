const { query } = require('../config/database');

async function findAll({ busca, page = 1, limit = 20 } = {}) {
  const conditions = ['ativo = TRUE'];
  const params = [];
  if (busca) {
    params.push(`%${busca.toLowerCase()}%`);
    conditions.push(`(LOWER(placa) LIKE $${params.length} OR LOWER(modelo) LIKE $${params.length} OR LOWER(marca) LIKE $${params.length})`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM vehicles ${where} ORDER BY placa ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM vehicles WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByPlaca(placa) {
  const { rows } = await query('SELECT * FROM vehicles WHERE placa = $1', [placa]);
  return rows[0] || null;
}

async function create({ placa, modelo, marca }) {
  const { rows } = await query(
    `INSERT INTO vehicles (placa, modelo, marca) VALUES ($1, $2, $3) RETURNING *`,
    [placa, modelo, marca]
  );
  return rows[0];
}

async function update(id, { modelo, marca }) {
  const { rows } = await query(
    `UPDATE vehicles SET modelo = COALESCE($2, modelo), marca = COALESCE($3, marca)
     WHERE id = $1 RETURNING *`,
    [id, modelo, marca]
  );
  return rows[0] || null;
}

/**
 * Histórico de consumo de insumos por veículo, usado no relatório
 * "consumo por veículo" e em GET /api/vehicles/:id/consumo.
 */
async function consumo(vehicleId) {
  const { rows } = await query(
    `SELECT m.id, m.data_movimentacao, m.quantidade, m.observacao,
            p.codigo AS produto_codigo, p.nome AS produto_nome, p.unidade,
            u.nome AS responsavel
     FROM movements m
     JOIN products p ON p.id = m.product_id
     JOIN users u ON u.id = m.user_id
     WHERE m.vehicle_id = $1 AND m.type = 'saida'
     ORDER BY m.data_movimentacao DESC`,
    [vehicleId]
  );
  return rows;
}

module.exports = { findAll, findById, findByPlaca, create, update, consumo };
