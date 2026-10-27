// Login e logout feitos em outra aba refletem nesta sem esperar a proxima chamada a API (vistoria)
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { jwt } from './helpers';

const Probe = () => {
  const auth = useAuth();
  return <span data-testid="who">{auth.isAuthenticated ? auth.user?.email : 'anonimo'}</span>;
};
const who = () => screen.getByTestId('who').textContent;

// Simula o que o navegador entrega a esta aba quando outra aba muda o localStorage
const outraAba = (mudanca: () => void, key: string | null) =>
  act(() => {
    mudanca();
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('peptidelab_token', jwt('a'));
  localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'a', email: 'a@x.org' }));
});

describe('sessao entre abas', () => {
  it('logout em outra aba encerra a sessao aqui na hora', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(who()).toBe('a@x.org');
    await outraAba(() => {
      localStorage.removeItem('peptidelab_token');
      localStorage.removeItem('peptidelab_user');
    }, 'peptidelab_token');
    expect(who()).toBe('anonimo');
  });

  it('login de outra conta em outra aba troca a identidade aqui', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await outraAba(() => {
      localStorage.setItem('peptidelab_token', jwt('b'));
      localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'b', email: 'b@x.org' }));
    }, 'peptidelab_user');
    expect(who()).toBe('b@x.org');
  });

  it('limpeza total do storage em outra aba tambem encerra', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await outraAba(() => localStorage.clear(), null);
    expect(who()).toBe('anonimo');
  });

  it('mudanca em outra chave nao mexe na sessao', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await outraAba(() => localStorage.setItem('outra', 'x'), 'outra');
    expect(who()).toBe('a@x.org');
  });
});
