import api from './axiosClient';

export async function getDashboardStats() {
  const { data } = await api.get('/dashboard/stats');
  return data;
}
