const reportRepository = require('../repositories/report.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const consumoVeiculo = asyncHandler(async (req, res) => {
  const { placa } = req.query;
  if (!placa) throw ApiError.badRequest('Informe o parâmetro "placa".');
  const dados = await reportRepository.consumoPorVeiculo(placa.toUpperCase());
  res.json(dados);
});

const consumoCategoria = asyncHandler(async (req, res) => {
  const { data_inicio: dataInicio, data_fim: dataFim } = req.query;
  const dados = await reportRepository.consumoPorCategoria({ dataInicio, dataFim });
  res.json(dados);
});

const estoqueBaixo = asyncHandler(async (req, res) => {
  const dados = await reportRepository.estoqueBaixo();
  res.json(dados);
});

const atividadeUsuario = asyncHandler(async (req, res) => {
  const { user_id: userId, data_inicio: dataInicio, data_fim: dataFim } = req.query;
  const dados = await reportRepository.atividadePorUsuario({ userId, dataInicio, dataFim });
  res.json(dados);
});

/**
 * Exporta qualquer um dos relatórios acima em CSV.
 * Body: { relatorio: 'estoque-baixo' | 'consumo-categoria' | 'consumo-veiculo' | 'atividade-usuario', ...filtros }
 */
const exportCsv = asyncHandler(async (req, res) => {
  const { relatorio } = req.body;
  let linhas = [];
  let cabecalho = '';
  let nomeArquivo = 'relatorio.csv';

  if (relatorio === 'estoque-baixo') {
    const dados = await reportRepository.estoqueBaixo();
    cabecalho = 'codigo;nome;categoria;estoque_atual;estoque_minimo;quantidade_faltante';
    linhas = dados.map((d) => [d.codigo, d.nome, d.categoria, d.estoque_atual, d.estoque_minimo, d.quantidade_faltante].join(';'));
    nomeArquivo = 'estoque_baixo.csv';
  } else if (relatorio === 'consumo-categoria') {
    const dados = await reportRepository.consumoPorCategoria(req.body);
    cabecalho = 'categoria;entradas;saidas';
    linhas = dados.map((d) => [d.categoria, d.entradas, d.saidas].join(';'));
    nomeArquivo = 'consumo_categoria.csv';
  } else if (relatorio === 'consumo-veiculo') {
    if (!req.body.placa) throw ApiError.badRequest('Informe "placa" no corpo da requisição.');
    const dados = await reportRepository.consumoPorVeiculo(req.body.placa.toUpperCase());
    cabecalho = 'data;produto_codigo;produto_nome;quantidade;unidade;responsavel';
    linhas = dados.map((d) => [d.data_movimentacao, d.produto_codigo, d.produto_nome, d.quantidade, d.unidade, d.responsavel].join(';'));
    nomeArquivo = `consumo_${req.body.placa}.csv`;
  } else if (relatorio === 'atividade-usuario') {
    const dados = await reportRepository.atividadePorUsuario(req.body);
    cabecalho = 'usuario;tipo;total_movimentacoes;quantidade_total';
    linhas = dados.map((d) => [d.nome, d.type, d.total_movimentacoes, d.quantidade_total].join(';'));
    nomeArquivo = 'atividade_usuario.csv';
  } else {
    throw ApiError.badRequest('Relatório desconhecido. Use: estoque-baixo, consumo-categoria, consumo-veiculo ou atividade-usuario.');
  }

  const csv = '\ufeff' + [cabecalho, ...linhas].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  res.send(csv);
});

module.exports = { consumoVeiculo, consumoCategoria, estoqueBaixo, atividadeUsuario, exportCsv };
