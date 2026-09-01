const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Exige um access token válido no header Authorization: Bearer <token>.
 * Popula req.user com { id, role, nome, email } para uso nos
 * middlewares/controllers seguintes (ex: authorize(), audit log).
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Token de acesso ausente ou mal formatado.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      nome: payload.nome,
      email: payload.email
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token de acesso expirado. Use o refresh token.'));
    }
    return next(ApiError.unauthorized('Token de acesso inválido.'));
  }
}

module.exports = authenticate;
