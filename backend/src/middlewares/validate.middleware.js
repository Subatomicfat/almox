const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Roda depois das chains de validação (body(), query(), param()...)
 * de cada rota. Se houver erro de validação, responde 422 com a lista
 * de campos problemáticos em vez de deixar o erro chegar ao banco.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    campo: e.path,
    mensagem: e.msg
  }));
  return next(ApiError.unprocessable('Dados inválidos.', details));
}

module.exports = validate;
