const userRepository = require('../repositories/user.repository');
const auditRepository = require('../repositories/audit.repository');
const password = require('../utils/password');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const result = await userRepository.findAll({ page, limit });
  res.json(result);
});

const getById = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  if (!user) throw ApiError.notFound('Usuário não encontrado.');
  res.json(user);
});

const create = asyncHandler(async (req, res) => {
  const { nome, email, senha, role, departamento } = req.body;
  const existing = await userRepository.findByEmail(email);
  if (existing) throw ApiError.conflict('Já existe um usuário com este e-mail.');

  const senhaHash = await password.hash(senha);
  const user = await userRepository.create({ nome, email, senhaHash, role, departamento });
  await auditRepository.log({ userId: req.user.id, action: 'CREATE', table: 'users', recordId: user.id, newValues: user, ip: req.ip });
  res.status(201).json(user);
});

const update = asyncHandler(async (req, res) => {
  const before = await userRepository.findById(req.params.id);
  if (!before) throw ApiError.notFound('Usuário não encontrado.');

  const user = await userRepository.update(req.params.id, req.body);
  await auditRepository.log({
    userId: req.user.id, action: 'UPDATE', table: 'users', recordId: user.id, oldValues: before, newValues: user, ip: req.ip
  });
  res.json(user);
});

// Regra do RBAC: só admin acessa esta rota (ver users.routes.js) — mesmo
// assim, exclusão de usuário é sempre soft delete (nunca DELETE físico),
// preservando a integridade referencial do histórico de movimentações.
const remove = asyncHandler(async (req, res) => {
  const before = await userRepository.findById(req.params.id);
  if (!before) throw ApiError.notFound('Usuário não encontrado.');
  if (Number(req.params.id) === req.user.id) {
    throw ApiError.badRequest('Você não pode desativar o próprio usuário.');
  }

  const user = await userRepository.softDelete(req.params.id);
  await auditRepository.log({
    userId: req.user.id, action: 'DELETE', table: 'users', recordId: user.id, oldValues: before, newValues: user, ip: req.ip
  });
  res.status(204).send();
});

module.exports = { list, getById, create, update, remove };
