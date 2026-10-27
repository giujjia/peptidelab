import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, getAuthToken, api } from '../services/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextData {
  session: { access_token: string } | null;
  user: User | null;
  login: (email: string, pass: string) => Promise<any>;
  registerAccount: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<{ revoked: boolean }>;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const TOKEN_KEY = 'peptidelab_token';
const USER_KEY = 'peptidelab_user';

// Storage indisponivel mantem a sessao apenas em memoria, sem impedir o login
const persistIdentity = (token: string | null, u: User | null) => {
  try {
    if (token && u) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    console.warn('Local storage unavailable, session kept only in memory');
  }
};

const userFromToken = (token: string, email: string): User => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.sub, email };
  } catch {
    return { id: '', email };
  }
};

const isValidUser = (u: any): u is User =>
  !!u && typeof u === 'object' && typeof u.id === 'string' && typeof u.email === 'string';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token, sessao e usuario mudam sempre juntos
  const applyIdentity = useCallback((token: string | null, u: User | null) => {
    persistIdentity(token, u);
    setAuthToken(token);
    setSession(token ? { access_token: token } : null);
    setUser(u);
  }, []);

  useEffect(() => {
    let savedToken: string | null = null;
    let savedUser: unknown = null;
    try {
      savedToken = localStorage.getItem(TOKEN_KEY);
      const rawUser = localStorage.getItem(USER_KEY);
      savedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      // Storage ilegivel ou usuario corrompido invalida a identidade salva
      savedToken = null;
      applyIdentity(null, null);
    }

    if (savedToken) {
      // Valida se o JWT expirou
      let isExpired = false;
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          isExpired = true;
        }
      } catch {
        isExpired = true;
      }

      if (!isExpired && isValidUser(savedUser)) {
        applyIdentity(savedToken, savedUser);
      } else {
        applyIdentity(null, null);
      }
    }
    setIsLoading(false);

    const handleUnauthorized = (event: Event) => {
      // 401 de uma chamada feita com outro token nao derruba a sessao atual
      const requestToken = (event as CustomEvent<{ token?: string | null }>).detail?.token;
      if (!requestToken || requestToken !== getAuthToken()) return;
      applyIdentity(null, null);
    };

    // Login ou logout feito em outra aba chega pelo evento storage, sem esperar a proxima chamada a API
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TOKEN_KEY && event.key !== USER_KEY) return;
      let token: string | null = null;
      let saved: unknown = null;
      try {
        token = localStorage.getItem(TOKEN_KEY);
        const raw = localStorage.getItem(USER_KEY);
        saved = raw ? JSON.parse(raw) : null;
      } catch {
        token = null;
      }
      if (!token || !isValidUser(saved)) {
        setAuthToken(null);
        setSession(null);
        setUser(null);
      } else if (token !== getAuthToken()) {
        setAuthToken(token);
        setSession({ access_token: token });
        setUser(saved);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyIdentity]);

  const login = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/login', { email, password: pass });
    if (data && data.access_token) {
      applyIdentity(data.access_token, userFromToken(data.access_token, email));
    }
    return data;
  };

  const registerAccount = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/register', { email, password: pass });
    if (data && data.access_token) {
      applyIdentity(data.access_token, userFromToken(data.access_token, email));
    }
    return data;
  };

  // Saida local sempre acontece; revoked indica se o servidor confirmou a revogacao
  const logout = async () => {
    let revoked = true;
    if (session?.access_token) {
      try {
        await api.post('/auth/logout');
      } catch (err: any) {
        revoked = err?.response?.status === 401;
      }
    }
    applyIdentity(null, null);
    return { revoked };
  };

  // Identidade so e limpa depois que o servidor confirma a desativacao
  const deleteAccount = async () => {
    if (session?.access_token) {
      await api.delete('/auth/account');
    }
    applyIdentity(null, null);
  };

  return (
    <AuthContext.Provider value={{ session, user, login, registerAccount, logout, deleteAccount, isAuthenticated: !!session, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
