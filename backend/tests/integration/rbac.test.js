// Verifica a combinação authenticate + authorize() nas rotas reais,
// usando tokens de verdade (assinados com o mesmo segredo que a app
// usa, via jwtUtil) — não é um teste de unidade do middleware isolado,
// é o comportamento real de ponta a ponta na rota.

jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/audit.repository');
jest.mock('../../src/repositories/product.repository');

const request = require('supertest');
const app = require('../../src/app');
const jwtUtil = require('../../src/utils/jwt');
const userRepository = require('../../src/repositories/user.repository');
const productRepository = require('../../src/repositories/product.repository');

function tokenPara(role, overrides = {}) {
  return jwtUtil.signAccessToken({ id: 1, role, nome: 'Teste', email: 'teste@empresa.com.br', ...overrides });
}

describe('RBAC em rotas protegidas', () => {
  test('sem Authorization header -> 401', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  test('header mal formatado (sem "Bearer ") -> 401', async () => {
    const res = await request(app).get('/api/products').set('Authorization', tokenPara('admin'));
    expect(res.status).toBe(401);
  });

  test('token válido mas de papel "visualizador" NÃO pode criar produto -> 403', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${tokenPara('visualizador')}`)
      .send({ codigo: 'X1', nome: 'Item', categoria: 'FR', unidade: 'un', estoqueMinimo: 1, estoqueAtual: 1 });

    expect(res.status).toBe(403);
    expect(productRepository.create).not.toHaveBeenCalled();
  });

  test('token de "operador" NÃO pode acessar gestão de usuários -> 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenPara('operador')}`);

    expect(res.status).toBe(403);
  });

  test('token de "admin" acessa gestão de usuários normalmente', async () => {
    userRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenPara('admin')}`);

    expect(res.status).toBe(200);
    expect(userRepository.findAll).toHaveBeenCalled();
  });

  test('token expirado -> 401 com mensagem específica', async () => {
    // Assina manualmente com expiração já vencida para simular o cenário.
    const jwt = require('jsonwebtoken');
    const env = require('../../src/config/env');
    const tokenExpirado = jwt.sign({ sub: 1, role: 'admin' }, env.jwt.accessSecret, { expiresIn: -10 });

    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${tokenExpirado}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expirado/i);
  });
});
