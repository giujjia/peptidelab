// Corpo de erro nao JSON (I41), erro estruturado na tela (I43) e saidas por mutacao com resumo de rejeicoes (I52, C07)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../src/services/api';
import { Register } from '../src/pages/Register';
import { Login } from '../src/pages/Login';
import { Processor } from '../src/pages/Processor';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider, useNotification } from '../src/contexts/NotificationContext';
import { jwt, jsonResponse, urlOf } from './helpers';

beforeEach(() => {
  localStorage.clear();
});

const validacao422 = { detail: [{ loc: ['body', 'password'], msg: 'A senha deve ter pelo menos 6 caracteres', type: 'value_error' }] };

describe('corpo de erro (I41)', () => {
  it('texto simples de erro e preservado na mensagem e nos dados', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream diagnostic', { status: 502 }));
    const err: any = await api.get('/qualquer').catch(e => e);
    expect(err.message).toBe('upstream diagnostic');
    expect(err.response.data).toBe('upstream diagnostic');
  });

  it('lista de validacao vira mensagem legivel', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(422, validacao422));
    const err: any = await api.post('/auth/register', {}).catch(e => e);
    expect(err.message).toBe('password: A senha deve ter pelo menos 6 caracteres');
  });
});

describe('erro estruturado na tela (I43)', () => {
  it('cadastro mostra erro de validacao sem quebrar a renderizacao', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(422, validacao422));
    render(<MemoryRouter><AuthProvider><Register /></AuthProvider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: 'a@x.org' } });
    const senhas = screen.getAllByLabelText(/Password/);
    senhas.forEach(campo => fireEvent.change(campo, { target: { value: 'abcdef' } }));
    fireEvent.click(screen.getByRole('button', { name: /sign up|create|register|cadastr/i }));
    await waitFor(() => expect(screen.getByText('password: A senha deve ter pelo menos 6 caracteres')).toBeTruthy());
  });

  it('aviso global recebe detalhe estruturado e mostra texto', async () => {
    const Disparo = () => {
      const { notify } = useNotification();
      return <button onClick={() => notify(validacao422.detail as any)}>avisar</button>;
    };
    render(<NotificationProvider><Disparo /></NotificationProvider>);
    fireEvent.click(screen.getByText('avisar'));
    await waitFor(() => expect(screen.getByText('password: A senha deve ter pelo menos 6 caracteres')).toBeTruthy());
  });

  it('nova senha curta nao pode ser enviada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { message: 'ok' }));
    render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);
    fireEvent.click(screen.getByText('Forgot password?'));
    fireEvent.change(screen.getByLabelText('Account Email Address'), { target: { value: 'a@x.org' } });
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByLabelText('Reset Token Code')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Reset Token Code'), { target: { value: 'c' } });
    fireEvent.change(screen.getByLabelText(/New Password/), { target: { value: 'abc' } });
    expect((screen.getByText('Set New Password').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('saidas do Processor (I52) e resumo de rejeicoes', () => {
  beforeEach(() => {
    localStorage.setItem('peptidelab_token', jwt('u'));
    localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'u', email: 'u@x.org' }));
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/jobs/')) return Promise.resolve(jsonResponse(200, [{
        id: 'jf', user_id: 'u', mutation_type: 'frameshift', input_mode: 'text', input_text: null, file_url: null,
        output_fasta_path: 'x', output_dbf_path: null, output_dbpepmutref_path: null, error_message: null,
        status: 'COMPLETED', created_at: new Date().toISOString(),
      }]));
      if (url.endsWith('/jobs/jf/outputs')) return Promise.resolve(jsonResponse(200, {
        outputs: [
          { type: 'fasta', available: true },
          { type: 'inframe', available: true },
          { type: 'ext', available: false },
        ],
        summary: {
          accepted: 2, rejected: 1, replaced_versions: 0, replaced_lines: [],
          rejected_lines: [{ line: 'NM_9.1:c.4del', reason: 'transcrito NM_9 sem sequencia ou CDS na referencia' }],
        },
      }));
      if (url.endsWith('/jobs/jf/outputs/fasta')) return Promise.resolve(new Response('>fs1\nMKV'));
      if (url.endsWith('/jobs/jf/outputs/inframe')) return Promise.resolve(new Response('>inf1\nMEE'));
      return Promise.resolve(jsonResponse(200, {}));
    });
  });

  it('frameshift mostra inframe, marca ext como nao gerada e lista as rejeicoes', async () => {
    render(<MemoryRouter><NotificationProvider><AuthProvider><Processor /></AuthProvider></NotificationProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('View')).toBeTruthy());
    fireEvent.click(screen.getByText('View'));
    await waitFor(() => expect(screen.getByText('In-frame peptides (FASTA)')).toBeTruthy());
    expect(screen.getByText(/>inf1/)).toBeTruthy();
    expect(screen.getByText('Not generated for this job.')).toBeTruthy();
    expect(screen.getByText(/2 line\(s\) processed, 1 rejected/)).toBeTruthy();
    expect(screen.getByText('NM_9.1:c.4del')).toBeTruthy();
    expect(screen.queryByText('dbfinal (FASTA)')).toBeNull();
  });
});
