import { describe, test, expect } from 'vitest';
import { formatNumber, formatDate, formatDateTime, maskPlaca } from '../format';

describe('formatNumber', () => {
  test('formata número inteiro com separador de milhar pt-BR', () => {
    expect(formatNumber(1200)).toBe('1.200');
  });
  test('trata null/undefined como zero', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });
  test('formata decimais', () => {
    expect(formatNumber(12.5)).toBe('12,5');
  });
});

describe('maskPlaca', () => {
  test('converte para maiúsculo', () => {
    expect(maskPlaca('abc1234')).toBe('ABC1234');
  });
  test('remove caracteres que não são letra, número ou hífen', () => {
    expect(maskPlaca('abc#1234!!')).toBe('ABC1234');
  });
  test('preserva hífen (formato antigo ABC-1234)', () => {
    expect(maskPlaca('abc-1234')).toBe('ABC-1234');
  });
  test('limita a 8 caracteres', () => {
    expect(maskPlaca('abcdefghijk')).toHaveLength(8);
  });
});

describe('formatDate / formatDateTime', () => {
  test('retorna "-" para valor vazio', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
  });
  test('formata uma data ISO válida sem lançar erro', () => {
    expect(() => formatDate('2026-03-15T10:00:00Z')).not.toThrow();
    expect(formatDate('2026-03-15T10:00:00Z')).not.toBe('-');
  });
});
