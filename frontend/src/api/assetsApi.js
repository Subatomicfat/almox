import api from './axiosClient';

export async function listAssets(params = {}) {
  const { data } = await api.get('/assets', { params });
  return data;
}

export async function createAsset(payload) {
  const { data } = await api.post('/assets', payload);
  return data;
}

export async function updateAsset(id, payload) {
  const { data } = await api.put(`/assets/${id}`, payload);
  return data;
}
