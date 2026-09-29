export function maskPlaca(value) {
  // Aceita padrão antigo (ABC-1234) e Mercosul (ABC1D23), sempre maiúsculo
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
}

export function formatNumber(n) {
  return new Intl.NumberFormat('pt-BR').format(n ?? 0);
}

/**
 * Formata em Real (R$), usado nos campos/relatórios de custo do
 * Kardex (custo médio, valor de estoque, valor total da movimentação).
 * `null`/`undefined` vira "—" em vez de "R$ 0,00" — em ENTRADA sem
 * custo informado, ou em produtos que nunca tiveram custo lançado,
 * mostrar "R$ 0,00" passaria a falsa impressão de "custo zero
 * confirmado" em vez de "custo desconhecido".
 */
export function formatCurrency(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}
