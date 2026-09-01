const ApiError = require('../../src/utils/ApiError');

describe('utils/ApiError', () => {
  test('badRequest() cria um erro com status 400 e isOperational=true', () => {
    const err = ApiError.badRequest('quantidade inválida');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('quantidade inválida');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  test.each([
    ['unauthorized', 401],
    ['forbidden', 403],
    ['notFound', 404],
    ['conflict', 409],
    ['unprocessable', 422]
  ])('%s() usa o status HTTP %i', (method, expectedStatus) => {
    const err = ApiError[method]('mensagem');
    expect(err.statusCode).toBe(expectedStatus);
  });

  test('unauthorized() e forbidden() têm mensagem padrão quando nenhuma é passada', () => {
    expect(ApiError.unauthorized().message).toMatch(/autenticado/i);
    expect(ApiError.forbidden().message).toMatch(/permiss/i);
  });

  test('badRequest() com details preserva os details no objeto', () => {
    const details = [{ campo: 'quantidade', mensagem: 'obrigatório' }];
    const err = ApiError.badRequest('dados inválidos', details);
    expect(err.details).toEqual(details);
  });
});
