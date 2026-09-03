import api from './axiosClient';

export async function listProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  return data; // { data, total, page, limit }
}

export async function getEstoqueBaixo() {
  const { data } = await api.get('/products/estoque-baixo');
  return data;
}

export async function createProduct(payload) {
  const { data } = await api.post('/products', payload);
  return data;
}

export async function updateProduct(id, payload) {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  await api.delete(`/products/${id}`);
}

export async function importProductsCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/products/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
