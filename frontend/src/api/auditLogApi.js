import api from './axiosClient';

export async function listAuditLog(params = {}) {
  const { data } = await api.get('/audit-log', { params });
  return data;
}
