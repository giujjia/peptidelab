import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken, api } from '../services/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextData {
  session: { access_token: string } | null;
  user: User | null;
  login: (email: string, pass: string) => Promise<any>;
  registerAccount: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('peptidelab_token');
      const savedUser = localStorage.getItem('peptidelab_user');
      if (savedToken) {
        // Valida se o JWT expirou
        let isExpired = false;
        try {
          const payloadStr = atob(savedToken.split('.')[1]);
          const payload = JSON.parse(payloadStr);
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            isExpired = true;
          }
        } catch {
          isExpired = true;
        }

        if (isExpired) {
          localStorage.removeItem('peptidelab_token');
          localStorage.removeItem('peptidelab_user');
        } else {
          setSession({ access_token: savedToken });
          setAuthToken(savedToken);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      }
    } catch {
      // Ignora erro de acesso a localStorage
    } finally {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setSession(null);
      setUser(null);
      setAuthToken(null);
      localStorage.removeItem('peptidelab_token');
      localStorage.removeItem('peptidelab_user');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/login', { email, password: pass });
    if (data && data.access_token) {
      setSession({ access_token: data.access_token });
      setAuthToken(data.access_token);
      localStorage.setItem('peptidelab_token', data.access_token);

      let u: User;
      try {
        const payloadStr = atob(data.access_token.split('.')[1]);
        const payload = JSON.parse(payloadStr);
        u = { id: payload.sub, email };
      } catch {
        u = { id: '', email };
      }
      setUser(u);
      localStorage.setItem('peptidelab_user', JSON.stringify(u));
    }
    return data;
  };

  const registerAccount = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/register', { email, password: pass });
    if (data && data.access_token) {
      setSession({ access_token: data.access_token });
      setAuthToken(data.access_token);
      localStorage.setItem('peptidelab_token', data.access_token);

      let u: User;
      try {
        const payloadStr = atob(data.access_token.split('.')[1]);
        const payload = JSON.parse(payloadStr);
        u = { id: payload.sub, email };
      } catch {
        u = { id: '', email };
      }
      setUser(u);
      localStorage.setItem('peptidelab_user', JSON.stringify(u));
    }
    return data;
  };

  const logout = async () => {
    try {
      if (session?.access_token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Falha silenciosa no logout
    } finally {
      setSession(null);
      setUser(null);
      setAuthToken(null);
      localStorage.removeItem('peptidelab_token');
      localStorage.removeItem('peptidelab_user');
    }
  };

  const deleteAccount = async () => {
    try {
      if (session?.access_token) {
        await api.delete('/auth/account');
      }
    } finally {
      setSession(null);
      setUser(null);
      setAuthToken(null);
      localStorage.removeItem('peptidelab_token');
      localStorage.removeItem('peptidelab_user');
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, login, registerAccount, logout, deleteAccount, isAuthenticated: !!session, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
