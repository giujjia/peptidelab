// Verificacao de e-mail ligada ao token atual (I42) e fluxo de recuperacao isolado por abertura (I45)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { VerifyEmail } from '../src/pages/VerifyEmail';
import { Login } from '../src/pages/Login';
import { AuthProvider } from '../src/contexts/AuthContext';
import { jsonResponse, deferred, urlOf } from './helpers';

beforeEach(() => {
  localStorage.clear();
});

const tokenDoCorpo = (init?: RequestInit) => JSON.parse(String(init?.body ?? '{}')).token;

const IrPara = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>ir</button>;
};

describe('verificacao de e-mail (I42)', () => {
  it('resposta atrasada do token anterior nao vira sucesso do token atual', async () => {
    const respostaA = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      const token = tokenDoCorpo(init);
      if (token === 'tokA') return respostaA.promise;
      return Promise.resolve(jsonResponse(400, { detail: 'Token invalido' }));
    });
    render(
      <MemoryRouter initialEntries={['/verify-email?token=tokA']}>
        <Routes>
          <Route path="/verify-email" element={<><VerifyEmail /><IrPara to="/verify-email?token=tokB" /></>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('ir'));
    await waitFor(() => expect(screen.getByText('Token invalido')).toBeTruthy());
    await act(async () => {
      respostaA.resolve(jsonResponse(200, { message: 'ok' }));
      await respostaA.promise;
    });
    expect(screen.queryByText('Email Verified!')).toBeNull();
    expect(screen.getByText('Verification Failed')).toBeTruthy();
  });

  it('novo token reinicia a tela em vez de manter o sucesso anterior', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      Promise.resolve(tokenDoCorpo(init) === 'okA'
        ? jsonResponse(200, { message: 'ok' })
        : jsonResponse(400, { detail: 'Token invalido' }))
    );
    render(
      <MemoryRouter initialEntries={['/verify-email?token=okA']}>
        <Routes>
          <Route path="/verify-email" element={<><VerifyEmail /><IrPara to="/verify-email?token=ruimB" /></>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Email Verified!')).toBeTruthy());
    fireEvent.click(screen.getByText('ir'));
    await waitFor(() => expect(screen.getByText('Token invalido')).toBeTruthy());
    expect(screen.queryByText('Email Verified!')).toBeNull();
  });

  it('StrictMode nao gasta o token de uso unico duas vezes', async () => {
    const usados = new Set<string>();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      const token = tokenDoCorpo(init);
      if (usados.has(token)) return Promise.resolve(jsonResponse(400, { detail: 'Token ja utilizado' }));
      usados.add(token);
      return Promise.resolve(jsonResponse(200, { message: 'ok' }));
    });
    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/verify-email?token=unico']}>
          <Routes><Route path="/verify-email" element={<VerifyEmail />} /></Routes>
        </MemoryRouter>
      </React.StrictMode>
    );
    await waitFor(() => expect(screen.getByText('Email Verified!')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('recuperacao de senha (I45)', () => {
  const preencher = (label: string, valor: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value: valor } });

  it('timer de fechamento do fluxo anterior nao fecha nem limpa o fluxo reaberto', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/auth/forgot-password')) return Promise.resolve(jsonResponse(200, { message: 'ok' }));
      if (url.endsWith('/auth/reset-password')) return Promise.resolve(jsonResponse(200, { message: 'ok' }));
      return Promise.resolve(jsonResponse(200, {}));
    });
    render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);

    fireEvent.click(screen.getByText('Forgot password?'));
    preencher('Account Email Address', 'a@x.org');
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByLabelText('Reset Token Code')).toBeTruthy());
    preencher('Reset Token Code', 'codigo');
    preencher('New Password', 'nova-senha');
    fireEvent.click(screen.getByText('Set New Password'));
    await waitFor(() => expect(screen.getByText('Password reset successfully! You can now log in.')).toBeTruthy());

    // Usuario fecha e reabre antes do fechamento automatico
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Forgot password?'));
    preencher('Account Email Address', 'outro@x.org');

    await act(() => new Promise(r => setTimeout(r, 1700)));
    expect(screen.getByText('Reset Password')).toBeTruthy();
    expect((screen.getByLabelText('Account Email Address') as HTMLInputElement).value).toBe('outro@x.org');
  });

  it('resposta de pedido de fluxo fechado nao altera o fluxo reaberto', async () => {
    const pedido = deferred<Response>();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => pedido.promise);
    render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);

    fireEvent.click(screen.getByText('Forgot password?'));
    preencher('Account Email Address', 'a@x.org');
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Forgot password?'));

    await act(async () => {
      pedido.resolve(jsonResponse(200, { message: 'ok' }));
      await pedido.promise;
    });
    // Fluxo novo continua na primeira etapa e sem mensagem do pedido antigo
    expect(screen.queryByText('If an account exists, we sent a reset link to this email. Open the link, or paste the code from it below.')).toBeNull();
    expect(screen.queryByLabelText('Reset Token Code')).toBeNull();
  });
});
