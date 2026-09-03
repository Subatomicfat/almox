import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * O access token vive só em memória (não em localStorage/sessionStorage),
 * para reduzir o que um ataque XSS conseguiria roubar. O refresh token
 * vive num cookie httpOnly, inacessível ao JavaScript — só o backend o lê.
 * Por isso `withCredentials: true` é obrigatório em toda instância.
 */
let accessToken = null;
let onAuthFailure = () => {}; // registrado pelo AuthContext (logout + redirect)

export function setAccessToken(token) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function registerAuthFailureHandler(fn) {
  onAuthFailure = fn;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Instância separada, sem interceptors, usada só para chamar
// /auth/refresh-token — evita loop infinito de interceptor chamando
// interceptor.
const rawApi = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = []; // requisições que chegaram enquanto o refresh estava em andamento

function resolveQueue(newToken) {
  pendingQueue.forEach(({ resolve }) => resolve(newToken));
  pendingQueue = [];
}
function rejectQueue(error) {
  pendingQueue.forEach(({ reject }) => reject(error));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response) return Promise.reject(error); // erro de rede, sem response

    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh-token');

    if (response.status === 401 && !config._retried && !isAuthEndpoint) {
      config._retried = true;

      if (isRefreshing) {
        // Já existe um refresh em andamento: espera o resultado dele
        // em vez de disparar outro refresh em paralelo.
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await rawApi.post('/auth/refresh-token');
        setAccessToken(data.accessToken);
        resolveQueue(data.accessToken);
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (refreshError) {
        rejectQueue(refreshError);
        setAccessToken(null);
        onAuthFailure(); // desloga e manda para /login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (response.status === 403) {
      // Sem permissão para o recurso — não desloga, só deixa o
      // componente que chamou tratar (mostrar toast, etc.)
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
export { rawApi };
