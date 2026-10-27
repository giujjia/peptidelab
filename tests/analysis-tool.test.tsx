// Polling com cleanup e cancelled (I16), resultado preso a sessao de origem (I64) e ocultas vindas do servidor (I67)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';

const { notify, apiMock, alvo } = vi.hoisted(() => ({
  notify: vi.fn(),
  apiMock: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn(), patch: vi.fn() },
  alvo: { currentTarget: {} as any },
}));
vi.mock('../src/contexts/NotificationContext', () => ({ useNotification: () => ({ notify }) }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ isLoading: false, user: null }) }));

vi.mock('../src/services/api', () => ({ api: apiMock, setAuthToken: vi.fn(), getAuthToken: () => null }));

// Filhos reduzidos ao necessario para disparar acoes e observar o estado
vi.mock('../src/components/analysis/UploadScreen', () => ({
  UploadScreen: ({ onUpload }: any) => <button onClick={() => onUpload([new File(['a'], 'a.csv')])}>upload</button>,
}));
vi.mock('../src/components/analysis/Sidebar', () => ({
  Sidebar: ({ onIdMappingClick, onCompareClick }: any) => (
    <>
      <button onClick={() => onIdMappingClick(alvo)}>idmap</button>
      <button onClick={() => onCompareClick(alvo)}>compare</button>
    </>
  ),
}));
vi.mock('../src/components/analysis/HeaderBar', () => ({
  HeaderBar: ({ onNewAnalysis, hiddenColumns, onToggleColumn }: any) => (
    <>
      <button onClick={onNewAnalysis}>new</button>
      <button onClick={() => onToggleColumn('k')}>toggle-k</button>
      <span data-testid="hidden">{hiddenColumns.join(',')}</span>
    </>
  ),
}));
vi.mock('../src/components/analysis/SheetTabs', () => ({
  SheetTabs: ({ sheetsInfo }: any) => <span data-testid="tabs">{Object.keys(sheetsInfo).join(',')}</span>,
}));
vi.mock('../src/components/analysis/IdMappingPopover', () => ({
  IdMappingPopover: ({ anchorEl, onConfirm }: any) =>
    anchorEl ? <button onClick={() => onConfirm({ col_origin: 'k' })}>confirm-idmap</button> : null,
}));
vi.mock('../src/components/analysis/ComparePopover', () => ({
  ComparePopover: ({ anchorEl, onConfirm }: any) =>
    anchorEl ? <button onClick={() => onConfirm({ sheet_a: 'a', sheet_b: 'b', col_key: 'k' })}>confirm-compare</button> : null,
}));
vi.mock('../src/components/analysis/DataTable', () => ({ DataTable: () => null }));
vi.mock('../src/components/analysis/PaginationControl', () => ({ PaginationControl: () => null }));
vi.mock('../src/components/analysis/FilterPopover', () => ({ FilterPopover: () => null }));
vi.mock('../src/components/analysis/EsmPopover', () => ({ EsmPopover: () => null }));
vi.mock('../src/components/analysis/CrossValPopover', () => ({ CrossValPopover: () => null }));
vi.mock('../src/components/analysis/JobsDrawer', () => ({ JobsDrawer: () => null }));
vi.mock('../src/components/common/TaskProgressWidget', () => ({ TaskProgressWidget: () => null }));

import { AnalysisTool } from '../src/pages/AnalysisTool';

type Estado = {
  sessoes: Array<{ session_id: string; sheets: Record<string, any> }>;
  ocultas: Record<string, string[]>;
  status: Record<string, any>;
  toggleFalha: boolean;
};
let estado: Estado;

const paginaDe = (sid: string, aba: string) => {
  const todas = estado.sessoes.find(s => s.session_id === sid)!.sheets[aba].columns as string[];
  const ocultas = estado.ocultas[`${sid}/${aba}`] || [];
  return { columns: todas.filter(c => !ocultas.includes(c)), all_columns: todas, data: [], total_rows: 0, page: 1, page_size: 50, total_pages: 1 };
};

beforeEach(() => {
  notify.mockReset();
  estado = {
    sessoes: [
      { session_id: 'S1', sheets: { a: { columns: ['k', 'x'], row_count: 1 }, b: { columns: ['k'], row_count: 1 } } },
      { session_id: 'S2', sheets: { a: { columns: ['k', 'x'], row_count: 1 } } },
    ],
    ocultas: { 'S1/a': ['x'] },
    status: {},
    toggleFalha: false,
  };
  let uploads = 0;
  apiMock.get.mockImplementation(async (url: string) => {
    const pagina = url.match(/^\/analysis\/sheet\/([^/]+)\/([^/]+)$/);
    if (pagina) return { data: paginaDe(pagina[1], pagina[2]) };
    const status = url.match(/status\/(.+)$/);
    if (status) return { data: estado.status[status[1]] || { status: 'running' } };
    return { data: [] };
  });
  apiMock.post.mockImplementation(async (url: string, body: any) => {
    if (url === '/analysis/upload') return { data: estado.sessoes[uploads++] };
    if (url === '/analysis/run-compare') return { data: { task_id: 'T1' } };
    if (url === '/analysis/run-id-mapping') return { data: { task_id: 'M1' } };
    if (url === '/analysis/toggle-columns') {
      if (estado.toggleFalha) throw Object.assign(new Error('falhou'), { response: { status: 500, data: { detail: 'falhou' } } });
      estado.ocultas[`${body.session_id}/${body.sheet_name}`] = body.hidden_columns;
      return { data: { data: paginaDe(body.session_id, body.sheet_name) } };
    }
    return { data: {} };
  });
  apiMock.delete.mockResolvedValue({ data: {} });
});

// Passos curtos para que cada act aplique os efeitos pendentes ao longo da espera
const esperar = async (ms: number) => {
  for (let passado = 0; passado < ms; passado += 100) {
    await act(() => new Promise(r => setTimeout(r, 100)));
  }
};
const chamadas = (trecho: string) => apiMock.get.mock.calls.filter(c => String(c[0]).includes(trecho)).length;

const abrirSessao = async () => {
  fireEvent.click(screen.getByText('upload'));
  await waitFor(() => expect(screen.getByTestId('tabs')).toBeTruthy());
};

describe('polling de tarefas (I16)', () => {
  it('sair da tela encerra o polling do ID Mapping', async () => {
    const { unmount } = render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('idmap'));
    fireEvent.click(screen.getByText('confirm-idmap'));
    await esperar(2300);
    expect(chamadas('id-mapping-status/M1')).toBeGreaterThan(0);
    unmount();
    const antes = chamadas('id-mapping-status/M1');
    await esperar(4300);
    expect(chamadas('id-mapping-status/M1')).toBe(antes);
  }, 15000);

  it('tarefa cancelada encerra o polling e avisa', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    estado.status.M1 = { status: 'cancelled' };
    fireEvent.click(screen.getByText('idmap'));
    fireEvent.click(screen.getByText('confirm-idmap'));
    await esperar(2300);
    const antes = chamadas('id-mapping-status/M1');
    await esperar(4300);
    expect(chamadas('id-mapping-status/M1')).toBe(antes);
    expect(notify).toHaveBeenCalledWith('ID Mapping cancelled', 'info');
  }, 15000);
});

describe('resultado preso a sessao de origem (I64)', () => {
  it('comparacao da sessao anterior nao altera o catalogo da sessao nova', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('compare'));
    fireEvent.click(screen.getByText('confirm-compare'));
    await esperar(50);
    fireEvent.click(screen.getByText('new'));
    await waitFor(() => expect(screen.getByText('upload')).toBeTruthy());
    await abrirSessao();
    estado.status.T1 = { status: 'done', nova_aba: 'cmp_ab' };
    await esperar(2300);
    expect(screen.getByTestId('tabs').textContent).toBe('a');
    expect(chamadas('/analysis/sheet/S2/cmp_ab')).toBe(0);
  }, 15000);
});

describe('colunas ocultas vindas do servidor (I67)', () => {
  it('sessao aberta mostra as ocultas persistidas', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    await waitFor(() => expect(screen.getByTestId('hidden').textContent).toBe('x'));
  });

  it('falha ao alternar nao deixa estado otimista divergente', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    await waitFor(() => expect(screen.getByTestId('hidden').textContent).toBe('x'));
    estado.toggleFalha = true;
    fireEvent.click(screen.getByText('toggle-k'));
    await esperar(50);
    expect(screen.getByTestId('hidden').textContent).toBe('x');
  });

  it('aba com o mesmo nome em outra sessao nao herda ocultas', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    await waitFor(() => expect(screen.getByTestId('hidden').textContent).toBe('x'));
    fireEvent.click(screen.getByText('new'));
    await waitFor(() => expect(screen.getByText('upload')).toBeTruthy());
    await abrirSessao();
    await esperar(50);
    expect(screen.getByTestId('hidden').textContent).toBe('');
    fireEvent.click(screen.getByText('toggle-k'));
    await esperar(50);
    // Pedido da sessao nova leva so a coluna alternada
    const ultimo = apiMock.post.mock.calls.filter(c => c[0] === '/analysis/toggle-columns').pop()!;
    expect(ultimo[1]).toEqual({ session_id: 'S2', sheet_name: 'a', hidden_columns: ['k'] });
  });
});
