// Resultados do Processor ligados ao Job e a identidade atuais (I50)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Processor } from '../src/pages/Processor';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { api } from '../src/services/api';
import { jwt, jsonResponse, deferred, urlOf } from './helpers';

const job = (id: string, mutation_type: string) => ({
  id, user_id: 'u', mutation_type, input_mode: 'text', input_text: null, file_url: null,
  output_fasta_path: null, output_dbf_path: null, output_dbpepmutref_path: 'x', error_message: null,
  status: 'COMPLETED', created_at: new Date().toISOString(),
});

let relacaoA: ReturnType<typeof deferred<Response>>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('peptidelab_token', jwt('u'));
  localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'u', email: 'u@x.org' }));
  Element.prototype.scrollIntoView = vi.fn();
  relacaoA = deferred<Response>();
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = urlOf(input);
    if (url.endsWith('/jobs/')) return Promise.resolve(jsonResponse(200, [job('ja', 'missense'), job('jb', 'indel')]));
    if (url.endsWith('/jobs/ja/outputs/relation')) return relacaoA.promise;
    if (url.endsWith('/jobs/jb/outputs/relation')) return Promise.resolve(new Response('relacao-do-job-b'));
    if (url.includes('/outputs/')) return Promise.resolve(new Response(''));
    if (url.endsWith('/sessao-expirada')) return Promise.resolve(jsonResponse(401, { detail: 'expirado' }));
    return Promise.resolve(jsonResponse(200, {}));
  });
});

const montar = () =>
  render(
    <MemoryRouter>
      <NotificationProvider>
        <AuthProvider>
          <Processor />
        </AuthProvider>
      </NotificationProvider>
    </MemoryRouter>
  );

describe('visualizacao de resultados (I50)', () => {
  it('resposta atrasada do Job A nao substitui a visualizacao do Job B', async () => {
    montar();
    await waitFor(() => expect(screen.getAllByText('View')).toHaveLength(2));
    fireEvent.click(screen.getAllByText('View')[0]);
    fireEvent.click(screen.getAllByText('View')[1]);
    await waitFor(() => expect(screen.getByText('relacao-do-job-b')).toBeTruthy());
    await act(async () => {
      relacaoA.resolve(new Response('relacao-do-job-a'));
      await relacaoA.promise;
    });
    expect(screen.queryByText('relacao-do-job-a')).toBeNull();
    expect(screen.getByText('relacao-do-job-b')).toBeTruthy();
  });

  it('perda da identidade sem navegar limpa resultados e lista de Jobs', async () => {
    montar();
    await waitFor(() => expect(screen.getAllByText('View')).toHaveLength(2));
    fireEvent.click(screen.getAllByText('View')[1]);
    await waitFor(() => expect(screen.getByText('relacao-do-job-b')).toBeTruthy());
    await act(() => api.get('/sessao-expirada').catch(() => null));
    await waitFor(() => expect(screen.queryByText('relacao-do-job-b')).toBeNull());
    expect(screen.queryAllByText('View')).toHaveLength(0);
  });

  it('pedido pendente nao reabre visualizacao depois da perda de identidade', async () => {
    montar();
    await waitFor(() => expect(screen.getAllByText('View')).toHaveLength(2));
    fireEvent.click(screen.getAllByText('View')[0]);
    await act(() => api.get('/sessao-expirada').catch(() => null));
    await act(async () => {
      relacaoA.resolve(new Response('relacao-do-job-a'));
      await relacaoA.promise;
    });
    expect(screen.queryByText('relacao-do-job-a')).toBeNull();
  });
});
