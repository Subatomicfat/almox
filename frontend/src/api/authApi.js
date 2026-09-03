import api, { rawApi } from './axiosClient';

export async function login(email, senha) {
  const { data } = await api.post('/auth/login', { email, senha });
  return data; // { accessToken, user }
}

export async function refreshToken() {
  const { data } = await rawApi.post('/auth/refresh-token');
  return data; // { accessToken }
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}
