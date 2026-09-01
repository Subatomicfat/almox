const productRepository = require('../repositories/product.repository');
const auditRepository = require('../repositories/audit.repository');
const cache = require('../utils/cache');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const PRODUCTS_CACHE_TTL = 600; // 10 min, conforme o prompt original
const PRODUCTS_VERSION_KEY = 'cache:products:version';

const list = asyncHandler(async (req, res) => {
  const { categoria, busca, sort } = req.query;
  const estoqueBaixo = req.query.estoque_baixo === 'true';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);

  // Cache versionado: a chave inclui a versão atual de "products". Uma
  // mutação (create/update/delete/import) incrementa a versão, e daí em
  // diante nenhuma chave antiga é lida de novo — expira sozinha pelo TTL.
  // Evita precisar de um DEL por padrão (KEYS/SCAN), que é arriscado em
  // Redis de produção com muitas chaves.
  const version = await cache.getVersion(PRODUCTS_VERSION_KEY);
  const cacheKey = `cache:products:list:v${version}:${JSON.stringify({ categoria, estoqueBaixo, busca, page, limit, sort })}`;

  const result = await cache.withCache(cacheKey, PRODUCTS_CACHE_TTL, () =>
    productRepository.findAll({ categoria, estoqueBaixo, busca, page, limit, sort })
  );
  res.json(result);
});

const getById = asyncHandler(async (req, res) => {
  const product = await productRepository.findById(req.params.id);
  if (!product) throw ApiError.notFound('Produto não encontrado.');
  res.json(product);
});

const create = asyncHandler(async (req, res) => {
  const { codigo, nome, categoria, unidade, estoqueMinimo, estoqueAtual } = req.body;

  const existing = await productRepository.findByCodigo(codigo.toUpperCase());
  if (existing) throw ApiError.conflict(`Já existe um produto com o código ${codigo}.`);

  const product = await productRepository.create({
    codigo: codigo.toUpperCase(), nome, categoria, unidade,
    estoqueMinimo: estoqueMinimo ?? 0, estoqueAtual: estoqueAtual ?? 0
  });
  await auditRepository.log({ userId: req.user.id, action: 'CREATE', table: 'products', recordId: product.id, newValues: product, ip: req.ip });
  await cache.bumpVersion(PRODUCTS_VERSION_KEY);
  res.status(201).json(product);
});

const update = asyncHandler(async (req, res) => {
  const before = await productRepository.findById(req.params.id);
  if (!before) throw ApiError.notFound('Produto não encontrado.');

  const product = await productRepository.update(req.params.id, req.body);
  await auditRepository.log({
    userId: req.user.id, action: 'UPDATE', table: 'products', recordId: product.id, oldValues: before, newValues: product, ip: req.ip
  });
  await cache.bumpVersion(PRODUCTS_VERSION_KEY);
  res.json(product);
});

// Soft delete apenas — o requisito pede explicitamente "DELETE (soft delete)"
const remove = asyncHandler(async (req, res) => {
  const before = await productRepository.findById(req.params.id);
  if (!before) throw ApiError.notFound('Produto não encontrado.');

  const product = await productRepository.softDelete(req.params.id);
  await auditRepository.log({
    userId: req.user.id, action: 'DELETE', table: 'products', recordId: product.id, oldValues: before, newValues: product, ip: req.ip
  });
  await cache.bumpVersion(PRODUCTS_VERSION_KEY);
  res.status(204).send();
});

const estoqueBaixo = asyncHandler(async (req, res) => {
  const itens = await productRepository.estoqueBaixo();
  res.json(itens);
});

/**
 * Importa produtos em massa via CSV (uso previsto: migrar a planilha
 * de ~1.500 itens do Excel — ver MIGRATION_GUIDE.md).
 * Formato esperado por linha: codigo;nome;categoria;unidade;minimo;atual
 * Aceita ; ou , como delimitador e ignora uma linha de cabeçalho.
 */
const importCsv = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Envie um arquivo CSV no campo "file".');

  const texto = req.file.buffer.toString('utf-8');
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (linhas.length === 0) return res.json({ importados: 0, ignorados: 0, erros: 0, detalhesErros: [] });

  const delimitador = linhas[0].includes(';') ? ';' : ',';
  let inicio = 0;
  const cabecalho = linhas[0].toLowerCase();
  if (cabecalho.includes('codigo') || cabecalho.includes('código') || cabecalho.includes('nome')) inicio = 1;

  const categoriasValidas = ['FR', 'CO', 'IP', 'MI'];
  let importados = 0, ignorados = 0, erros = 0;
  const detalhesErros = [];

  for (let i = inicio; i < linhas.length; i++) {
    const cols = linhas[i].split(delimitador).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) { erros++; detalhesErros.push({ linha: i + 1, motivo: 'Colunas insuficientes' }); continue; }

    const [codigoRaw, nome, categoriaRaw, unidade, minimoRaw, atualRaw] = cols;
    const codigo = (codigoRaw || '').toUpperCase();
    const categoria = (categoriaRaw || '').toUpperCase();
    const minimo = parseFloat(minimoRaw);
    const atual = parseFloat(atualRaw);

    if (!codigo || !nome || !categoriasValidas.includes(categoria) || isNaN(minimo) || isNaN(atual)) {
      erros++; detalhesErros.push({ linha: i + 1, motivo: 'Dados inválidos ou categoria fora de FR/CO/IP/MI' }); continue;
    }

    const existing = await productRepository.findByCodigo(codigo);
    if (existing) { ignorados++; continue; }

    const product = await productRepository.create({ codigo, nome, categoria, unidade: unidade || 'un', estoqueMinimo: minimo, estoqueAtual: atual });
    await auditRepository.log({ userId: req.user.id, action: 'CREATE', table: 'products', recordId: product.id, newValues: product, ip: req.ip });
    importados++;
  }

  if (importados > 0) await cache.bumpVersion(PRODUCTS_VERSION_KEY);
  res.json({ importados, ignorados, erros, detalhesErros: detalhesErros.slice(0, 50) });
});

module.exports = { list, getById, create, update, remove, estoqueBaixo, importCsv };
