import api from './axiosClient';

export async function listMovements(params = {}) {
  const { data } = await api.get('/movements', { params });
  return data;
}

export async function createMovement(payload) {
  const { data } = await api.post('/movements', payload);
  return data;
}

export async function adjustMovement(id, payload) {
  const { data } = await api.put(`/movements/${id}`, payload);
  return data;
}
