const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Middleware global de erro — deve ser o ÚLTIMO registrado em app.js.
 * Erros operacionais (ApiError) retornam a mensagem ao cliente.
 * Erros inesperados (bugs, falha de conexão etc.) NUNCA expõem a
 * stack trace em produção — apenas uma mensagem genérica, com o
 * detalhe completo indo para o log do servidor.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = !!err.isOperational;

  logger.error(err.message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user.id : null,
    ip: req.ip,
    stack: env.nodeEnv === 'production' ? undefined : err.stack
  });

  const body = {
    error: {
      message: isOperational
        ? err.message
        : 'Ocorreu um erro interno. Tente novamente ou contate o suporte.',
      ...(err.details ? { details: err.details } : {}),
      ...(env.nodeEnv !== 'production' && !isOperational ? { stack: err.stack } : {})
    }
  };

  res.status(statusCode).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Rota não encontrada: ${req.method} ${req.originalUrl}` } });
}

module.exports = { errorHandler, notFoundHandler };
