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
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/login', { email, password: pass });
    if (data && data.access_token) {
      setSession({ access_token: data.access_token });
      setAuthToken(data.access_token);

      try {
        const payloadStr = atob(data.access_token.split('.')[1]);
        const payload = JSON.parse(payloadStr);
        setUser({ id: payload.sub, email });
      } catch (e) {
        setUser({ id: '', email });
      }
    }
    return data;
  };

  const registerAccount = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/register', { email, password: pass });
    if (data) {
      return await login(email, pass);
    }
    return data;
  };

  const logout = async () => {
    try {
      if (session?.access_token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Falha silenciosa no logout
    } finally {
      setSession(null);
      setUser(null);
      setAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, login, registerAccount, logout, isAuthenticated: !!session, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
