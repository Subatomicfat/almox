const ApiError = require('../utils/ApiError');

/**
 * Matriz de permissões do sistema.
 *   admin        -> acesso total
 *   gestor       -> CRUD completo, exceto exclusão de usuários
 *   operador     -> registrar movimentações e consultar
 *   visualizador -> apenas leitura
 *
 * authorize(...roles) exige que req.user.role esteja na lista.
 * Deve ser usado sempre DEPOIS do middleware `authenticate`.
 */
function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(
        `Seu perfil (${req.user.role}) não tem permissão para esta operação.`
      ));
    }
    return next();
  };
}

module.exports = authorize;
