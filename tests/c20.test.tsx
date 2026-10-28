// Conta trocada em outra aba (F01), verificacao de e-mail (F02, N01), reset de senha (N02)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Processor } from '../src/pages/Processor';
import { ResetPassword } from '../src/pages/ResetPassword';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { jwt, jsonResponse, deferred, urlOf } from './helpers';

const job = (id: string) => ({
  id, user_id: 'u', mutation_type: 'missense', input_mode: 'text', input_text: null, file_url: null,
  output_fasta_path: null, output_dbf_path: null, output_dbpepmutref_path: 'x', error_message: null,
  status: 'COMPLETED', created_at: new Date().toISOString(),
});

const entrar = (sub: string) => {
  localStorage.setItem('peptidelab_token', jwt(sub));
  localStorage.setItem('peptidelab_user', JSON.stringify({ id: sub, email: `${sub}@x.org` }));
};

const tokenDoPedido = (init?: RequestInit) => new Headers(init?.headers).get('Authorization');

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('troca de conta em outra aba (F01)', () => {
  it('lista de Jobs pedida pela conta A nao aparece para a conta B', async () => {
    entrar('a');
    const listaA = deferred<Response>();
    const tokenA = `Bearer ${jwt('a')}`;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (urlOf(input).endsWith('/jobs/')) {
        return tokenDoPedido(init) === tokenA ? listaA.promise : Promise.resolve(jsonResponse(200, []));
      }
      return Promise.resolve(jsonResponse(200, {}));
    });
    render(
      <MemoryRouter>
        <NotificationProvider><AuthProvider><Processor /></AuthProvider></NotificationProvider>
      </MemoryRouter>
    );
    await act(() => {
      entrar('b');
      window.dispatchEvent(new StorageEvent('storage', { key: 'peptidelab_token' }));
    });
    await act(async () => {
      listaA.resolve(jsonResponse(200, [job('ja'), job('jb')]));
      await listaA.promise;
    });
    await new Promise(r => setTimeout(r, 50));
    expect(screen.queryAllByText('View')).toHaveLength(0);
  });
});

describe('verificacao de e-mail (F02, N01)', () => {
  const abrir = (Pagina: React.FC, token: string) =>
    render(
      <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
        <Routes><Route path="/verify-email" element={<Pagina />} /></Routes>
      </MemoryRouter>
    );

  it('falha passageira nao fica guardada e o token pode ser tentado de novo', async () => {
    const { verifyEmailToken } = await import('../src/pages/VerifyEmail');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(503, { detail: 'indisponivel' }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'ok' }));
    await expect(verifyEmailToken('passageiro')).rejects.toBeTruthy();
    await expect(verifyEmailToken('passageiro')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('link aberto de novo em outra aba mostra sucesso, nao erro', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { message: 'ok' }))
      .mockResolvedValue(jsonResponse(400, { detail: 'Token de verificação inválido ou expirado' }));
    const primeira = await import('../src/pages/VerifyEmail');
    const { unmount } = abrir(primeira.VerifyEmail, 'reaberto');
    await waitFor(() => expect(screen.getByText('Email Verified!')).toBeTruthy());
    unmount();

    // Outra aba carrega o modulo do zero, sem o pedido guardado em memoria
    vi.resetModules();
    const segunda = await import('../src/pages/VerifyEmail');
    abrir(segunda.VerifyEmail, 'reaberto');
    await waitFor(() => expect(screen.getByText('Email Verified!')).toBeTruthy());
    expect(screen.queryByText('Verification Failed')).toBeNull();
  });

  it('token nunca confirmado neste navegador continua indo ao servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(400, { detail: 'Token invalido' }));
    const { VerifyEmail } = await import('../src/pages/VerifyEmail');
    abrir(VerifyEmail, 'desconhecido');
    await waitFor(() => expect(screen.getByText('Token invalido')).toBeTruthy());
  });
});

describe('reset de senha (N02)', () => {
  it('aba que fez o reset sai da conta e avisa as outras pelo storage', async () => {
    entrar('u');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { message: 'ok' }));
    render(
      <MemoryRouter initialEntries={['/reset-password?token=t1']}>
        <AuthProvider>
          <Routes><Route path="/reset-password" element={<ResetPassword />} /></Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'senha-nova-123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'senha-nova-123' } });
    fireEvent.click(screen.getByText('Set New Password'));
    await waitFor(() => expect(screen.getByText(/every device signed in/)).toBeTruthy());
    expect(localStorage.getItem('peptidelab_token')).toBeNull();
    expect(localStorage.getItem('peptidelab_user')).toBeNull();
  });
});
