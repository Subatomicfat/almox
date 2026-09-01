import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as authApi from '../api/authApi';
import { rawApi, setAccessToken, registerAuthFailureHandler } from '../api/axiosClient';

// O JWT usa base64url (sem padding, com '-' e '_' em vez de '+' e '/').
// atob() puro entende base64 "clássico", então convertemos antes.
function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    base64Url.length + ((4 - (base64Url.length % 4)) % 4), '='
  );
  return JSON.parse(atob(base64));
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true); // true enquanto tenta restaurar sessão

  const logout = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      try { await authApi.logout(); } catch { /* já vamos limpar o estado local de todo jeito */ }
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // Ao carregar a aplicação (ex: F5 na página), o access token em memória
  // se perdeu, mas o refresh token (cookie httpOnly) pode continuar válido.
  // Tenta uma renovação silenciosa antes de decidir que o usuário
  // precisa logar novamente.
  useEffect(() => {
    registerAuthFailureHandler(() => logout({ silent: true }));

    (async () => {
      try {
        const { data } = await rawApi.post('/auth/refresh-token');
        setAccessToken(data.accessToken);
        // O refresh não retorna os dados do usuário — decodificamos o
        // essencial do próprio token (payload não sensível) só para
        // popular a UI até a próxima chamada autenticada confirmar.
        const payload = decodeJwtPayload(data.accessToken);
        setUser({ id: payload.sub, nome: payload.nome, email: payload.email, role: payload.role });
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [logout]);

  const login = useCallback(async (email, senha) => {
    const { accessToken, user: loggedUser } = await authApi.login(email, senha);
    setAccessToken(accessToken);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const hasRole = useCallback((...roles) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(() => ({
    user, bootstrapping, login, logout, hasRole, isAuthenticated: !!user
  }), [user, bootstrapping, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
