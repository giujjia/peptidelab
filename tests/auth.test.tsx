// 401 de token antigo (I36), identidade coerente com storage falho (I37), logout nao confirmado (I40) e desativacao falha (I46)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { Layout } from '../src/components/Layout';
import { api } from '../src/services/api';
import { jwt, jsonResponse, deferred, urlOf } from './helpers';

let auth: ReturnType<typeof useAuth>;
const Probe = () => {
  auth = useAuth();
  return <span data-testid="who">{auth.isAuthenticated ? auth.user?.email ?? 'sem-usuario' : 'anonimo'}</span>;
};

const who = () => screen.getByTestId('who').textContent;

beforeEach(() => {
  localStorage.clear();
});

describe('respostas 401 ligadas ao token da chamada (I36)', () => {
  it('401 atrasado de token antigo nao derruba a sessao nova', async () => {
    const tokenA = jwt('a');
    const tokenB = jwt('b');
    const logins = [tokenA, tokenB];
    const tarefas = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/auth/login')) return Promise.resolve(jsonResponse(200, { access_token: logins.shift() }));
      if (url.endsWith('/analysis/tasks')) return tarefas.promise;
      return Promise.resolve(jsonResponse(200, {}));
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    await act(() => auth.login('a@x.org', 'p'));
    const antiga = api.get('/analysis/tasks').catch(() => null);
    await act(() => auth.login('b@x.org', 'p'));
    await act(async () => {
      tarefas.resolve(jsonResponse(401, { detail: 'expirado' }));
      await antiga;
    });

    expect(who()).toBe('b@x.org');
  });

  it('401 do token atual encerra a sessao', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/auth/login')) return Promise.resolve(jsonResponse(200, { access_token: jwt('a') }));
      return Promise.resolve(jsonResponse(401, { detail: 'revogado' }));
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(() => auth.login('a@x.org', 'p'));
    await act(() => api.get('/analysis/tasks').catch(() => null));
    expect(who()).toBe('anonimo');
  });

  it('senha errada no login nao apaga a sessao salva de outra aba', async () => {
    localStorage.setItem('peptidelab_token', jwt('a'));
    localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'a', email: 'a@x.org' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, { detail: 'Credenciais invalidas' }));
    render(<AuthProvider><Probe /></AuthProvider>);
    const { setAuthToken } = await import('../src/services/api');
    // Formulario de login roda sem credencial ativa
    setAuthToken(null);
    await act(() => auth.login('a@x.org', 'errada').catch(() => null));
    expect(localStorage.getItem('peptidelab_token')).not.toBeNull();
  });
});

describe('identidade coerente (I37)', () => {
  it('login funciona com storage indisponivel, so em memoria', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { access_token: jwt('a') }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {
      await expect(auth.login('a@x.org', 'p')).resolves.toBeTruthy();
    });
    expect(who()).toBe('a@x.org');
  });

  it('usuario salvo corrompido nao deixa autenticado sem usuario', async () => {
    localStorage.setItem('peptidelab_token', jwt('a'));
    localStorage.setItem('peptidelab_user', '{corrompido');
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(who()).toBe('anonimo');
    expect(localStorage.getItem('peptidelab_token')).toBeNull();
  });
});

describe('logout e desativacao com falha no servidor (I40, I46)', () => {
  const logado = () => {
    localStorage.setItem('peptidelab_token', jwt('a'));
    localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'a', email: 'a@x.org' }));
  };

  it('logout sai localmente e informa revogacao nao confirmada', async () => {
    logado();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(503, { detail: 'db fora' }));
    render(<AuthProvider><Probe /></AuthProvider>);
    let resultado: any;
    await act(async () => {
      resultado = await auth.logout();
    });
    expect(resultado).toEqual({ revoked: false });
    expect(who()).toBe('anonimo');
  });

  it('desativacao recusada mantem a conta e mostra o erro', async () => {
    logado();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(500, { detail: 'Falha ao desativar' }));
    render(
      <MemoryRouter>
        <NotificationProvider>
          <AuthProvider>
            <Layout />
            <Probe />
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTitle('a@x.org'));
    fireEvent.click(screen.getByText('Delete Account'));
    fireEvent.click(screen.getByText('Yes, Delete My Account'));
    await waitFor(() => expect(screen.getByText('Falha ao desativar')).toBeTruthy());
    expect(screen.getByText('Confirm Account Deletion')).toBeTruthy();
    expect(who()).toBe('a@x.org');
  });
});
