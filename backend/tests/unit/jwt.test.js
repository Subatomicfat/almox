const jwtUtil = require('../../src/utils/jwt');

const fakeUser = { id: 42, role: 'gestor', nome: 'Maria Teste', email: 'maria@teste.com' };

describe('utils/jwt', () => {
  test('signAccessToken() gera um token que verifyAccessToken() consegue decodificar', () => {
    const token = jwtUtil.signAccessToken(fakeUser);
    const payload = jwtUtil.verifyAccessToken(token);
    expect(payload.sub).toBe(fakeUser.id);
    expect(payload.role).toBe('gestor');
    expect(payload.email).toBe(fakeUser.email);
  });

  test('signRefreshToken() gera um token que verifyRefreshToken() consegue decodificar', () => {
    const token = jwtUtil.signRefreshToken(fakeUser);
    const payload = jwtUtil.verifyRefreshToken(token);
    expect(payload.sub).toBe(fakeUser.id);
  });

  test('verifyAccessToken() rejeita um token assinado com outro segredo', () => {
    const jwt = require('jsonwebtoken');
    const tokenForjado = jwt.sign({ sub: 1, role: 'admin' }, 'segredo-errado');
    expect(() => jwtUtil.verifyAccessToken(tokenForjado)).toThrow();
  });

  test('hashToken() é determinístico (mesmo input -> mesmo hash) e não reversível à vista', () => {
    const token = 'um-refresh-token-qualquer';
    const h1 = jwtUtil.hashToken(token);
    const h2 = jwtUtil.hashToken(token);
    expect(h1).toBe(h2);
    expect(h1).not.toContain(token);
  });

  test('verifyAccessToken() rejeita um token com verifyRefreshToken (segredos diferentes)', () => {
    const refreshToken = jwtUtil.signRefreshToken(fakeUser);
    expect(() => jwtUtil.verifyAccessToken(refreshToken)).toThrow();
  });
});
