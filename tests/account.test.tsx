// Link de recuperacao com rota propria (I20) e regras de conta iguais as do servidor (I44)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../src/routes';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { Register } from '../src/pages/Register';
import { emailSchema, newPasswordSchema } from '../src/services/accountRules';
import { jsonResponse } from './helpers';

beforeEach(() => {
  localStorage.clear();
});

const app = (rota: string) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <NotificationProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </NotificationProvider>
    </MemoryRouter>
  );

const emoji = '\u{1F600}';

describe('link de recuperacao (I20)', () => {
  it('rota do e-mail abre a tela de nova senha e envia o token do link', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { message: 'ok' }));
    app('/reset-password?token=tok-do-email');
    expect(screen.getByText('Set a new password')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'nova-senha' } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: 'nova-senha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set New Password' }));
    await waitFor(() => expect(screen.getByText(/every device signed in to this account was signed out/)).toBeTruthy());
    const [url, init] = fetchMock.mock.calls.find(c => String(c[0]).endsWith('/auth/reset-password'))!;
    expect(String(url)).toContain('/auth/reset-password');
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'tok-do-email', new_password: 'nova-senha' });
  });

  it('confirmacao diferente ou senha curta em pontos de codigo nao envia', () => {
    app('/reset-password?token=t');
    const botao = () => screen.getByRole('button', { name: 'Set New Password' }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: emoji.repeat(3) } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: emoji.repeat(3) } });
    expect(botao().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'nova-senha' } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: 'nova-senhX' } });
    expect(botao().disabled).toBe(true);
  });

  it('link sem token explica o problema', () => {
    app('/reset-password');
    expect(screen.getByText(/This reset link is incomplete/)).toBeTruthy();
  });
});

describe('regras de conta iguais as do servidor (I44)', () => {
  it('senha conta pontos de codigo, como len() no Python', () => {
    expect(newPasswordSchema.safeParse(emoji.repeat(3)).success).toBe(false);
    expect(newPasswordSchema.safeParse(emoji.repeat(6)).success).toBe(true);
  });

  it('e-mail segue a mesma matriz do backend', () => {
    const casos: Record<string, string | null> = {
      '  Ana@Example.com\n': 'ana@example.com',
      'ana@example.com\n': 'ana@example.com',
      'a b@example.com': null,
      'ana@exa\nmple.com': null,
      'ana@example': null,
      [`a@${'b'.repeat(250)}.com`]: null,
    };
    for (const [entrada, esperado] of Object.entries(casos)) {
      const r = emailSchema.safeParse(entrada);
      expect(r.success ? r.data : null).toBe(esperado);
    }
  });

  it('cadastro recusa tres emojis antes de chamar o servidor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, {}));
    render(<MemoryRouter><AuthProvider><Register /></AuthProvider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: 'a@x.org' } });
    screen.getAllByLabelText(/Password/).forEach(c => fireEvent.change(c, { target: { value: emoji.repeat(3) } }));
    fireEvent.click(screen.getByRole('button', { name: /sign up|create|register|cadastr/i }));
    await waitFor(() => expect(screen.getByText('Password must be at least 6 characters')).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
