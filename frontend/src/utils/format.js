export function maskPlaca(value) {
  // Aceita padrão antigo (ABC-1234) e Mercosul (ABC1D23), sempre maiúsculo
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
}

export function formatNumber(n) {
  return new Intl.NumberFormat('pt-BR').format(n ?? 0);
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
