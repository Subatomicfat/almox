import { describe, test, expect } from 'vitest';
import { extractErrorMessage } from '../errors';

describe('extractErrorMessage', () => {
  test('extrai a mensagem do formato padrão do backend { error: { message } }', () => {
    const err = { response: { data: { error: { message: 'Estoque insuficiente.' } } } };
    expect(extractErrorMessage(err)).toBe('Estoque insuficiente.');
  });

  test('junta os details de validação quando não há message direto', () => {
    const err = {
      response: {
        data: { error: { details: [{ mensagem: 'Código obrigatório.' }, { mensagem: 'Categoria inválida.' }] } }
      }
    };
    expect(extractErrorMessage(err)).toBe('Código obrigatório. Categoria inválida.');
  });

  test('reconhece erro de rede especificamente', () => {
    const err = { message: 'Network Error' };
    expect(extractErrorMessage(err)).toMatch(/conectar ao servidor/i);
  });

  test('usa o fallback quando não reconhece o formato do erro', () => {
    expect(extractErrorMessage({}, 'Deu ruim.')).toBe('Deu ruim.');
  });

  test('usa o fallback padrão quando nenhum é passado', () => {
    expect(extractErrorMessage({})).toMatch(/ocorreu um erro/i);
  });
});
