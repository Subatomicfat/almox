/**
 * Envolve uma controller async e encaminha qualquer erro para o
 * middleware global (next(err)), em vez de exigir try/catch manual
 * em cada uma das ~30 rotas da API.
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
