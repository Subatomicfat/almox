const userRepository = require('../repositories/user.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const auditRepository = require('../repositories/audit.repository');
const password = require('../utils/password');
const jwtUtil = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const REFRESH_COOKIE_NAME = 'almox_refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,       // não acessível via JS no browser -> mitiga XSS roubando o token
  secure: process.env.NODE_ENV === 'production', // exige HTTPS em produção
  sameSite: 'strict',   // mitiga CSRF em conjunto com o SameSite do cookie
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function refreshExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

const login = asyncHandler(async (req, res) => {
  const { email, senha } = req.body;
  const user = await userRepository.findByEmail(email);

  const senhaValida = user ? await password.compare(senha, user.senha_hash) : false;

  if (!user || !user.ativo || !senhaValida) {
    await auditRepository.log({
      userId: user ? user.id : null,
      action: 'LOGIN_FAILED',
      table: 'users',
      recordId: user ? user.id : null,
      newValues: { email },
      ip: req.ip
    });
    throw ApiError.unauthorized('E-mail ou senha inválidos.');
  }

  const accessToken = jwtUtil.signAccessToken(user);
  const refreshToken = jwtUtil.signRefreshToken(user);
  await refreshTokenRepository.store(user.id, jwtUtil.hashToken(refreshToken), refreshExpiryDate());

  await auditRepository.log({ userId: user.id, action: 'LOGIN', table: 'users', recordId: user.id, ip: req.ip });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({
    accessToken,
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role, departamento: user.departamento }
  });
});

// Apenas admin pode criar novos usuários (rota protegida por authorize('admin'))
const register = asyncHandler(async (req, res) => {
  const { nome, email, senha, role, departamento } = req.body;

  const existing = await userRepository.findByEmail(email);
  if (existing) throw ApiError.conflict('Já existe um usuário com este e-mail.');

  const senhaHash = await password.hash(senha);
  const user = await userRepository.create({ nome, email, senhaHash, role, departamento });

  await auditRepository.log({
    userId: req.user.id, action: 'CREATE', table: 'users', recordId: user.id, newValues: user, ip: req.ip
  });

  res.status(201).json(user);
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
  if (!token) throw ApiError.unauthorized('Refresh token ausente.');

  let payload;
  try {
    payload = jwtUtil.verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Refresh token inválido ou expirado.');
  }

  const tokenHash = jwtUtil.hashToken(token);
  const stored = await refreshTokenRepository.findValid(tokenHash);
  if (!stored) throw ApiError.unauthorized('Refresh token revogado ou não encontrado. Faça login novamente.');

  const user = await userRepository.findById(payload.sub);
  if (!user || !user.ativo) throw ApiError.unauthorized('Usuário inativo.');

  // Rotação: revoga o token usado e emite um novo par — reduz a janela
  // de uso caso um refresh token tenha sido comprometido.
  await refreshTokenRepository.revoke(tokenHash);
  const newRefreshToken = jwtUtil.signRefreshToken(user);
  await refreshTokenRepository.store(user.id, jwtUtil.hashToken(newRefreshToken), refreshExpiryDate());

  const accessToken = jwtUtil.signAccessToken(user);
  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
  if (token) {
    await refreshTokenRepository.revoke(jwtUtil.hashToken(token));
  }
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  if (req.user) {
    await auditRepository.log({ userId: req.user.id, action: 'LOGOUT', table: 'users', recordId: req.user.id, ip: req.ip });
  }
  res.status(204).send();
});

module.exports = { login, register, refresh, logout, REFRESH_COOKIE_NAME };
