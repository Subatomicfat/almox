/**
 * Erro "esperado" da aplicação — o errorHandler sabe que pode expor
 * a mensagem ao cliente com segurança (diferente de um erro inesperado,
 * onde a stack trace nunca deve ir para a resposta).
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) { return new ApiError(400, message, details); }
  static unauthorized(message = 'Não autenticado.') { return new ApiError(401, message); }
  static forbidden(message = 'Você não tem permissão para executar esta ação.') { return new ApiError(403, message); }
  static notFound(message = 'Recurso não encontrado.') { return new ApiError(404, message); }
  static conflict(message) { return new ApiError(409, message); }
  static unprocessable(message, details) { return new ApiError(422, message, details); }
}

module.exports = ApiError;
