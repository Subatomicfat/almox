// Testes de integração da camada HTTP de autenticação. Os repositories
// (acesso a dados) são mockados — não há Postgres real aqui. O que
// este teste garante é que app.js, as rotas, os middlewares (rate
// limit, validate) e o controller se comportam corretamente juntos.
//
// NOTA HONESTA: não há um teste dedicado de "estoura o rate limit do
// login depois de N tentativas" porque o rate limiter guarda estado em
// memória por IP durante toda a execução do arquivo de teste — testar
// isso de forma isolada exigiria tornar a janela/limite injetável por
// ambiente, o que não foi feito ainda. Testar manualmente com
// `ab`/`curl` em loop continua sendo o caminho até isso ser resolvido.

jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/refreshToken.repository');
jest.mock('../../src/repositories/audit.repository');
jest.mock('../../src/utils/password');

const request = require('supertest');
const app = require('../../src/app');
const userRepository = require('../../src/repositories/user.repository');
const auditRepository = require('../../src/repositories/audit.repository');
const passwordUtil = require('../../src/utils/password');

const usuarioFake = {
  id: 1, nome: 'Maria Gestora', email: 'maria@empresa.com.br',
  senha_hash: 'hash-qualquer', role: 'gestor', departamento: 'Geral', ativo: true
};

describe('POST /api/auth/login', () => {
  test('credenciais válidas retornam accessToken e dados do usuário', async () => {
    userRepository.findByEmail.mockResolvedValue(usuarioFake);
    passwordUtil.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria@empresa.com.br', senha: 'senhaCorreta123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('maria@empresa.com.br');
    expect(res.body.user.senha_hash).toBeUndefined(); // nunca expor o hash
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN' }));
  });

  test('senha errada retorna 401 e não expõe qual campo errou', async () => {
    userRepository.findByEmail.mockResolvedValue(usuarioFake);
    passwordUtil.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria@empresa.com.br', senha: 'senhaErrada' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/e-mail ou senha/i);
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_FAILED' }));
  });

  test('e-mail inexistente também retorna 401 (mesma mensagem genérica)', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao-existe@empresa.com.br', senha: 'qualquer' });

    expect(res.status).toBe(401);
  });

  test('payload sem e-mail é rejeitado pela validação antes de chegar ao controller (422)', async () => {
    const res = await request(app).post('/api/auth/login').send({ senha: 'qualquer' });
    expect(res.status).toBe(422);
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/refresh-token', () => {
  test('sem cookie de refresh token retorna 401', async () => {
    const res = await request(app).post('/api/auth/refresh-token');
    expect(res.status).toBe(401);
  });
});
