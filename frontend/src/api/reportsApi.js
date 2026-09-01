import api from './axiosClient';

export async function consumoPorVeiculo(placa) {
  const { data } = await api.get('/reports/consumo-veiculo', { params: { placa } });
  return data;
}

export async function consumoPorCategoria(params = {}) {
  const { data } = await api.get('/reports/consumo-categoria', { params });
  return data;
}

export async function estoqueBaixoReport() {
  const { data } = await api.get('/reports/estoque-baixo');
  return data;
}

export async function atividadeUsuario(params = {}) {
  const { data } = await api.get('/reports/atividade-usuario', { params });
  return data;
}

/**
 * Retorna o CSV como Blob (o backend envia text/csv com Content-Disposition).
 */
export async function exportCsv(payload) {
  const response = await api.post('/reports/export-csv', payload, { responseType: 'blob' });
  return response.data;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
