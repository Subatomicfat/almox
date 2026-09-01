const assetRepository = require('../repositories/asset.repository');
const auditRepository = require('../repositories/audit.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { status, tipo, localizacao } = req.query;
  const assets = await assetRepository.findAll({ status, tipo, localizacao });
  res.json(assets);
});

const create = asyncHandler(async (req, res) => {
  const { codigo, nome, tipo, localizacao, status } = req.body;
  const existing = await assetRepository.findByCodigo(codigo.toUpperCase());
  if (existing) throw ApiError.conflict(`Já existe um ativo com o código ${codigo}.`);

  const asset = await assetRepository.create({ codigo: codigo.toUpperCase(), nome, tipo, localizacao, status });
  await auditRepository.log({ userId: req.user.id, action: 'CREATE', table: 'assets', recordId: asset.id, newValues: asset, ip: req.ip });
  res.status(201).json(asset);
});

const update = asyncHandler(async (req, res) => {
  const before = await assetRepository.findById(req.params.id);
  if (!before) throw ApiError.notFound('Ativo não encontrado.');

  const asset = await assetRepository.update(req.params.id, req.body);
  await auditRepository.log({
    userId: req.user.id, action: 'UPDATE', table: 'assets', recordId: asset.id, oldValues: before, newValues: asset, ip: req.ip
  });
  res.json(asset);
});

module.exports = { list, create, update };
