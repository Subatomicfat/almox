const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');
const auditRepository = require('./audit.repository');

/**
 * Cria uma movimentação de forma atômica:
 *   1. Trava a linha do produto (FOR UPDATE) para evitar que duas
 *      requisições simultâneas leiam o mesmo saldo e ambas aprovem
 *      uma saída que, juntas, deixariam o estoque negativo.
 *   2. Revalida a regra "saída não pode exceder o estoque atual"
 *      com o valor travado (não com o valor lido antes da transaction).
 *   3. Insere a movimentação — o trigger fn_atualizar_estoque cuida de
 *      somar/subtrair products.estoque_atual.
 *   4. Insere o registro de auditoria na MESMA transaction: se qualquer
 *      passo falhar, tudo é desfeito (ROLLBACK) e nada fica "meio feito".
 */
async function create({ productId, type, quantidade, userId, vehicleId, referencia, observacao, ip }) {
  return withTransaction(async (client) => {
    const { rows: productRows } = await client.query(
      'SELECT * FROM products WHERE id = $1 AND ativo = TRUE FOR UPDATE',
      [productId]
    );
    const product = productRows[0];
    if (!product) {
      throw ApiError.notFound('Produto não encontrado ou inativo.');
    }
    if (type === 'saida' && Number(quantidade) > Number(product.estoque_atual)) {
      throw ApiError.badRequest(
        `Quantidade de saída (${quantidade}) maior que o estoque atual (${product.estoque_atual} ${product.unidade}).`
      );
    }

    const { rows } = await client.query(
      `INSERT INTO movements (product_id, type, quantidade, user_id, vehicle_id, referencia, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [productId, type, quantidade, userId, vehicleId || null, referencia || null, observacao || null]
    );
    const movement = rows[0];

    await auditRepository.log({
      client,
      userId,
      action: 'CREATE',
      table: 'movements',
      recordId: movement.id,
      newValues: movement,
      ip
    });

    return movement;
  });
}

/**
 * Regra de negócio: movimentações não podem ser excluídas ou editadas
 * livremente. Uma "correção" cria uma NOVA movimentação de ajuste, do
 * tipo oposto ou de mesmo tipo dependendo do caso, referenciando a
 * original via adjustment_of — preserva o histórico completo.
 */
async function createAdjustment({ originalMovementId, type, quantidade, userId, justificativa, ip }) {
  if (!justificativa || justificativa.trim().length < 5) {
    throw ApiError.badRequest('Justificativa obrigatória para qualquer ajuste (mínimo 5 caracteres).');
  }

  return withTransaction(async (client) => {
    const { rows: origRows } = await client.query('SELECT * FROM movements WHERE id = $1', [originalMovementId]);
    const original = origRows[0];
    if (!original) throw ApiError.notFound('Movimentação original não encontrada.');

    const { rows: productRows } = await client.query(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
      [original.product_id]
    );
    const product = productRows[0];
    if (type === 'saida' && Number(quantidade) > Number(product.estoque_atual)) {
      throw ApiError.badRequest('Ajuste resultaria em estoque negativo.');
    }

    const { rows } = await client.query(
      `INSERT INTO movements (product_id, type, quantidade, user_id, referencia, observacao, adjustment_of)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [original.product_id, type, quantidade, userId, original.referencia,
        `AJUSTE: ${justificativa}`, original.id]
    );
    const adjustment = rows[0];

    await auditRepository.log({
      client, userId, action: 'UPDATE', table: 'movements', recordId: original.id,
      oldValues: original, newValues: { ...adjustment, justificativa }, ip
    });

    return adjustment;
  });
}

async function findAll({ dataInicio, dataFim, type, categoria, userId, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (dataInicio) { params.push(dataInicio); conditions.push(`m.data_movimentacao >= $${params.length}`); }
  if (dataFim) { params.push(dataFim); conditions.push(`m.data_movimentacao <= $${params.length}`); }
  if (type) { params.push(type); conditions.push(`m.type = $${params.length}`); }
  if (categoria) { params.push(categoria); conditions.push(`p.categoria = $${params.length}`); }
  if (userId) { params.push(userId); conditions.push(`m.user_id = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT m.*, p.codigo AS produto_codigo, p.nome AS produto_nome, p.categoria,
            u.nome AS responsavel, v.placa AS veiculo_placa
     FROM movements m
     JOIN products p ON p.id = m.product_id
     JOIN users u ON u.id = m.user_id
     LEFT JOIN vehicles v ON v.id = m.vehicle_id
     ${where}
     ORDER BY m.data_movimentacao DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT m.*, p.codigo AS produto_codigo, p.nome AS produto_nome
     FROM movements m JOIN products p ON p.id = m.product_id WHERE m.id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { create, createAdjustment, findAll, findById };
