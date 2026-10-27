// New Analysis preserva a sessao anterior e o historico a reabre (I08, vistoria); exclusao so explicita
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { notify, apiMock, auth } = vi.hoisted(() => ({
  notify: vi.fn(),
  apiMock: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn(), patch: vi.fn() },
  // Mesma referencia a cada render, como o contexto real
  auth: { isLoading: false, user: { id: 'u', email: 'u@x.org' } },
}));
vi.mock('../src/contexts/NotificationContext', () => ({ useNotification: () => ({ notify }) }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../src/services/api', () => ({ api: apiMock, setAuthToken: vi.fn(), getAuthToken: () => null }));

// Componentes visuais reduzidos; JobsDrawer e o fluxo da pagina sao os reais
vi.mock('../src/components/analysis/UploadScreen', () => ({
  UploadScreen: ({ onUpload, onOpenJobsDrawer }: any) => (
    <>
      <button onClick={() => onUpload([new File(['a'], 'a.csv')])}>upload</button>
      <button onClick={onOpenJobsDrawer}>historico</button>
    </>
  ),
}));
vi.mock('../src/components/analysis/HeaderBar', () => ({
  HeaderBar: ({ onNewAnalysis, onDeleteSession }: any) => (
    <>
      <button onClick={onNewAnalysis}>new</button>
      <button onClick={onDeleteSession}>excluir-sessao</button>
    </>
  ),
}));
vi.mock('../src/components/analysis/SheetTabs', () => ({
  SheetTabs: ({ sheetsInfo }: any) => <span data-testid="tabs">{Object.keys(sheetsInfo).join(',')}</span>,
}));
vi.mock('../src/components/analysis/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('../src/components/analysis/DataTable', () => ({
  DataTable: ({ data }: any) => <span data-testid="linhas">{(data || []).map((l: any) => l.x).join(',')}</span>,
}));
vi.mock('../src/components/analysis/PaginationControl', () => ({ PaginationControl: () => null }));
vi.mock('../src/components/analysis/FilterPopover', () => ({ FilterPopover: () => null }));
vi.mock('../src/components/analysis/EsmPopover', () => ({ EsmPopover: () => null }));
vi.mock('../src/components/analysis/IdMappingPopover', () => ({ IdMappingPopover: () => null }));
vi.mock('../src/components/analysis/ComparePopover', () => ({ ComparePopover: () => null }));
vi.mock('../src/components/analysis/CrossValPopover', () => ({ CrossValPopover: () => null }));
vi.mock('../src/components/common/TaskProgressWidget', () => ({ TaskProgressWidget: () => null }));

import { AnalysisTool } from '../src/pages/AnalysisTool';

// Sessao S1 guardada no "servidor" com uma aba e um resultado de ESM
const SESSAO = { session_id: 'S1', sheets: { resultados: { columns: ['x', 'Esm1vScore'], row_count: 2 } } };
const PAGINA = { sheet_name: 'resultados', columns: ['x', 'Esm1vScore'], all_columns: ['x', 'Esm1vScore'],
  data: [{ x: 'v1', Esm1vScore: 0.5 }, { x: 'v2', Esm1vScore: -1.2 }], total_rows: 2, page: 1, page_size: 50, total_pages: 1 };
let sessoesNoServidor: Set<string>;

beforeEach(() => {
  notify.mockReset();
  sessoesNoServidor = new Set(['S1']);
  apiMock.get.mockImplementation(async (url: string) => {
    if (url === '/analysis/tasks') return { data: [{ id: 'T1', task_type: 'esm', session_id: 'S1', status: 'done', progress: 2, total: 2 }] };
    if (url === '/analysis/session/S1') {
      if (!sessoesNoServidor.has('S1')) throw Object.assign(new Error('x'), { response: { status: 404, data: { detail: 'Session not found or expired' } } });
      return { data: structuredClone(SESSAO) };
    }
    if (url.startsWith('/analysis/sheet/S1/')) return { data: structuredClone(PAGINA) };
    return { data: [] };
  });
  apiMock.post.mockImplementation(async (url: string) => {
    if (url === '/analysis/upload') return { data: structuredClone(SESSAO) };
    return { data: {} };
  });
  apiMock.delete.mockImplementation(async (url: string) => {
    sessoesNoServidor.delete(url.split('/').pop()!);
    return { data: { success: true } };
  });
});

const abrirSessao = async () => {
  fireEvent.click(screen.getByText('upload'));
  await waitFor(() => expect(screen.getByTestId('tabs').textContent).toBe('resultados'));
};

describe('New Analysis e historico (I08)', () => {
  it('New Analysis preserva a sessao e o historico a reabre com abas e resultados', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    await waitFor(() => expect(screen.getByTestId('linhas').textContent).toBe('v1,v2'));

    fireEvent.click(screen.getByText('new'));
    await waitFor(() => expect(screen.getByText('upload')).toBeTruthy());
    expect(apiMock.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('historico'));
    fireEvent.click(await screen.findByText(/Background Tasks/));
    fireEvent.click(await screen.findByText('Open Session'));

    await waitFor(() => expect(screen.getByTestId('tabs').textContent).toBe('resultados'));
    await waitFor(() => expect(screen.getByTestId('linhas').textContent).toBe('v1,v2'));
    expect(apiMock.get).toHaveBeenCalledWith('/analysis/session/S1');
  });

  it('exclusao so acontece depois da confirmacao', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('excluir-sessao'));
    expect(apiMock.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this session?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Session' }));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/analysis/session/S1'));
    await waitFor(() => expect(screen.getByText('upload')).toBeTruthy());
  });

  it('cancelar a confirmacao mantem a sessao', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('excluir-sessao'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(() => new Promise(r => setTimeout(r, 50)));
    expect(apiMock.delete).not.toHaveBeenCalled();
    expect(screen.getByTestId('tabs').textContent).toBe('resultados');
  });

  it('recusa do servidor mantem o workspace e avisa', async () => {
    apiMock.delete.mockRejectedValueOnce(Object.assign(new Error('x'), {
      response: { status: 409, data: { detail: 'This session has a running background task. Cancel it before deleting the session.' } },
    }));
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('excluir-sessao'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Session' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(
      'This session has a running background task. Cancel it before deleting the session.', 'error'));
    expect(screen.getByTestId('tabs').textContent).toBe('resultados');
  });
});
