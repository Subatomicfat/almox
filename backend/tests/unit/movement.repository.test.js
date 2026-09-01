// Testa a lógica de movement.repository.js SEM um Postgres real:
// substitui withTransaction() para simplesmente chamar a função com um
// client falso que controlamos, e verificamos exatamente quais queries
// foram disparadas — é a forma mais direta de garantir que a regra
// "saída não pode exceder o estoque atual" é aplicada usando o valor
// TRAVADO (FOR UPDATE) dentro da transaction, e não um valor lido antes.

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn((fn) => fn(mockClient))
}));
jest.mock('../../src/repositories/audit.repository', () => ({
  log: jest.fn()
}));

const mockClient = { query: jest.fn() };

const { withTransaction } = require('../../src/config/database');
const auditRepository = require('../../src/repositories/audit.repository');
const movementRepository = require('../../src/repositories/movement.repository');

beforeEach(() => {
  mockClient.query.mockReset();
  withTransaction.mockImplementation((fn) => fn(mockClient));
  auditRepository.log.mockClear();
});

describe('movement.repository.create — regra "saída não pode exceder o estoque"', () => {
  test('rejeita uma saída maior que o estoque atual (lido com FOR UPDATE)', async () => {
    // 1ª query dentro da transaction = SELECT ... FOR UPDATE
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, estoque_atual: '5.00', unidade: 'un', ativo: true }]
    });

    await expect(
      movementRepository.create({ productId: 1, type: 'saida', quantidade: 10, userId: 7 })
    ).rejects.toMatchObject({ statusCode: 400 });

    // Nunca deve ter chegado a inserir a movimentação nem o log de auditoria.
    const insertCalls = mockClient.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO movements'));
    expect(insertCalls).toHaveLength(0);
    expect(auditRepository.log).not.toHaveBeenCalled();
  });

  test('aceita uma saída igual ao estoque atual (limite exato, não deve ser rejeitado)', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, estoque_atual: '5.00', unidade: 'un', ativo: true }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 99, product_id: 1, type: 'saida', quantidade: 5 }] });

    const movement = await movementRepository.create({ productId: 1, type: 'saida', quantidade: 5, userId: 7 });

    expect(movement.id).toBe(99);
    expect(auditRepository.log).toHaveBeenCalledTimes(1);
    expect(auditRepository.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', table: 'movements' }));
  });

  test('rejeita quando o produto não existe ou está inativo', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // produto não encontrado

    await expect(
      movementRepository.create({ productId: 999, type: 'entrada', quantidade: 1, userId: 7 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('entrada não tem limite de quantidade (só saída é validada contra o estoque)', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, estoque_atual: '5.00', unidade: 'un', ativo: true }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100, product_id: 1, type: 'entrada', quantidade: 1000 }] });

    const movement = await movementRepository.create({ productId: 1, type: 'entrada', quantidade: 1000, userId: 7 });
    expect(movement.quantidade).toBe(1000);
  });
});

describe('movement.repository.createAdjustment — correção nunca edita/exclui a original', () => {
  test('exige justificativa com no mínimo 5 caracteres', async () => {
    await expect(
      movementRepository.createAdjustment({ originalMovementId: 1, type: 'entrada', quantidade: 1, userId: 7, justificativa: 'oi' })
    ).rejects.toMatchObject({ statusCode: 400 });
    // Nem chegou a abrir a transaction, porque a validação é síncrona antes.
    expect(withTransaction).not.toHaveBeenCalled();
  });

  test('cria uma NOVA movimentação referenciando a original via adjustment_of', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 50, product_id: 1, referencia: 'ABC-1234' }] }) // SELECT movimentação original
      .mockResolvedValueOnce({ rows: [{ id: 1, estoque_atual: '20.00' }] })                  // SELECT produto FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 51, adjustment_of: 50, type: 'entrada', quantidade: 3 }] }); // INSERT ajuste

    const adjustment = await movementRepository.createAdjustment({
      originalMovementId: 50, type: 'entrada', quantidade: 3, userId: 7, justificativa: 'Erro de digitação na quantidade'
    });

    expect(adjustment.adjustment_of).toBe(50);
    const insertCall = mockClient.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO movements'));
    expect(insertCall[1]).toContain(50); // adjustment_of vai no INSERT
  });
});
