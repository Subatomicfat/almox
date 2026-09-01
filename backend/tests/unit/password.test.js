const password = require('../../src/utils/password');

describe('utils/password', () => {
  test('hash() produz um valor diferente do texto original', async () => {
    const hash = await password.hash('minhaSenha123');
    expect(hash).not.toBe('minhaSenha123');
    expect(hash.length).toBeGreaterThan(20);
  });

  test('compare() retorna true para a senha correta', async () => {
    const hash = await password.hash('minhaSenha123');
    await expect(password.compare('minhaSenha123', hash)).resolves.toBe(true);
  });

  test('compare() retorna false para a senha errada', async () => {
    const hash = await password.hash('minhaSenha123');
    await expect(password.compare('senhaErrada', hash)).resolves.toBe(false);
  });

  test('duas chamadas de hash() para a mesma senha geram hashes diferentes (salt aleatório)', async () => {
    const hash1 = await password.hash('mesmaSenha');
    const hash2 = await password.hash('mesmaSenha');
    expect(hash1).not.toBe(hash2);
  });
});
