const { query } = require('../config/database');

async function consumoPorVeiculo(placa) {
  const { rows } = await query(
    `SELECT m.data_movimentacao, p.codigo AS produto_codigo, p.nome AS produto_nome,
            m.quantidade, p.unidade, u.nome AS responsavel
     FROM movements m
     JOIN products p ON p.id = m.product_id
     JOIN vehicles v ON v.id = m.vehicle_id
     JOIN users u ON u.id = m.user_id
     WHERE v.placa = $1 AND m.type = 'saida'
     ORDER BY m.data_movimentacao DESC`,
    [placa]
  );
  return rows;
}

async function consumoPorCategoria({ dataInicio, dataFim } = {}) {
  const conditions = [];
  const params = [];
  if (dataInicio) { params.push(dataInicio); conditions.push(`m.data_movimentacao >= $${params.length}`); }
  if (dataFim) { params.push(dataFim); conditions.push(`m.data_movimentacao <= $${params.length}`); }
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT p.categoria,
            COALESCE(SUM(CASE WHEN m.type = 'entrada' THEN m.quantidade ELSE 0 END), 0) AS entradas,
            COALESCE(SUM(CASE WHEN m.type = 'saida' THEN m.quantidade ELSE 0 END), 0) AS saidas
     FROM products p
     LEFT JOIN movements m ON m.product_id = p.id ${where}
     GROUP BY p.categoria
     ORDER BY p.categoria`,
    params
  );
  return rows;
}

async function estoqueBaixo() {
  const { rows } = await query('SELECT * FROM vw_estoque_baixo ORDER BY quantidade_faltante DESC');
  return rows;
}

async function atividadePorUsuario({ userId, dataInicio, dataFim } = {}) {
  const conditions = [];
  const params = [];
  if (userId) { params.push(userId); conditions.push(`m.user_id = $${params.length}`); }
  if (dataInicio) { params.push(dataInicio); conditions.push(`m.data_movimentacao >= $${params.length}`); }
  if (dataFim) { params.push(dataFim); conditions.push(`m.data_movimentacao <= $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT u.id AS user_id, u.nome, m.type, COUNT(*) AS total_movimentacoes,
            SUM(m.quantidade) AS quantidade_total
     FROM movements m
     JOIN users u ON u.id = m.user_id
     ${where}
     GROUP BY u.id, u.nome, m.type
     ORDER BY u.nome, m.type`,
    params
  );
  return rows;
}

async function dashboardStats() {
  const [{ rows: totalProdutos }, { rows: alertas }, { rows: movsHoje }, { rows: veiculos }, { rows: ativos }] =
    await Promise.all([
      query('SELECT COUNT(*) FROM products WHERE ativo = TRUE'),
      query('SELECT COUNT(*) FROM vw_estoque_baixo'),
      query(`SELECT COUNT(*) FROM movements WHERE data_movimentacao::date = CURRENT_DATE`),
      query('SELECT COUNT(*) FROM vehicles WHERE ativo = TRUE'),
      query('SELECT COUNT(*) FROM assets WHERE ativo = TRUE')
    ]);

  return {
    totalProdutos: parseInt(totalProdutos[0].count, 10),
    estoqueBaixo: parseInt(alertas[0].count, 10),
    movimentacoesHoje: parseInt(movsHoje[0].count, 10),
    totalVeiculos: parseInt(veiculos[0].count, 10),
    totalAtivos: parseInt(ativos[0].count, 10)
  };
}

module.exports = { consumoPorVeiculo, consumoPorCategoria, estoqueBaixo, atividadePorUsuario, dashboardStats };
