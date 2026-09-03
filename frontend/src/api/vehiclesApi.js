import api from './axiosClient';

export async function listVehicles(params = {}) {
  const { data } = await api.get('/vehicles', { params });
  return data;
}

export async function getVehicleConsumo(id) {
  const { data } = await api.get(`/vehicles/${id}/consumo`);
  return data; // { veiculo, historico }
}

export async function createVehicle(payload) {
  const { data } = await api.post('/vehicles', payload);
  return data;
}

export async function updateVehicle(id, payload) {
  const { data } = await api.put(`/vehicles/${id}`, payload);
  return data;
}
