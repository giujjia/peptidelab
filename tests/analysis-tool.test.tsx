// Polling com cleanup e cancelled (I16), resultado preso a sessao de origem (I64) e ocultas vindas do servidor (I67)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { deferred } from './helpers';

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
  Sidebar: ({ onIdMappingClick, onCompareClick, onFilterClick, onDisconnectJob, connectedJobId, connectedJobInfo, filteredDataLength, totalRows }: any) => (
    <>
      <button onClick={() => onIdMappingClick(alvo)}>idmap</button>
      <button onClick={() => onCompareClick(alvo)}>compare</button>
      <button onClick={() => onFilterClick(alvo, 'remove-contaminants')}>contaminants</button>
      <button onClick={onDisconnectJob}>disconnect</button>
      <span data-testid="job">{connectedJobId}|{connectedJobInfo?.mutation_type ?? ''}</span>
      <span data-testid="rows">{filteredDataLength}/{totalRows}</span>
    </>
  ),
}));
vi.mock('../src/components/analysis/HeaderBar', () => ({
  HeaderBar: ({ onNewAnalysis, hiddenColumns, onToggleColumn, setSearchQuery, onDownload, onImportFiles }: any) => (
    <>
      <button onClick={onNewAnalysis}>new</button>
      <button onClick={() => onImportFiles([new File(['p'], 'vazou.csv')])}>import</button>
      <button onClick={() => onToggleColumn('k')}>toggle-k</button>
      <button onClick={onDownload}>download</button>
      <input data-testid="search" onChange={(e) => setSearchQuery(e.target.value)} />
      <span data-testid="hidden">{hiddenColumns.join(',')}</span>
    </>
  ),
}));
vi.mock('../src/components/analysis/SheetTabs', () => ({
  SheetTabs: ({ sheetsInfo, onChange }: any) => (
    <>
      <span data-testid="tabs">{Object.keys(sheetsInfo).join(',')}</span>
      <span data-testid="cols-a">{(sheetsInfo.a?.columns || []).join(',')}</span>
      <button onClick={() => onChange('a')}>tab-a</button>
    </>
  ),
}));
vi.mock('../src/components/analysis/FilterPopover', () => ({
  FilterPopover: ({ anchorEl, onConfirm }: any) =>
    anchorEl ? <button onClick={() => onConfirm({ target_column: 'k', keyword: '^x' })}>confirm-filter</button> : null,
}));
vi.mock('../src/components/analysis/JobsDrawer', () => ({
  JobsDrawer: ({ onLoadJobAsSession }: any) => <button onClick={() => onLoadJobAsSession('J1')}>load-job</button>,
}));
vi.mock('../src/utils/download', () => ({ downloadBlob: vi.fn() }));
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
vi.mock('../src/components/analysis/EsmPopover', () => ({ EsmPopover: () => null }));
vi.mock('../src/components/analysis/CrossValPopover', () => ({ CrossValPopover: () => null }));
vi.mock('../src/components/common/TaskProgressWidget', () => ({ TaskProgressWidget: () => null }));

import { AnalysisTool } from '../src/pages/AnalysisTool';

type Estado = {
  sessoes: Array<{ session_id: string; sheets: Record<string, any> }>;
  ocultas: Record<string, string[]>;
  status: Record<string, any>;
  toggleFalha: boolean;
  // Resposta segurada ate o teste liberar, por rota
  atrasos: Record<string, Promise<unknown>>;
};
let estado: Estado;

const paginaDe = (sid: string, aba: string) => {
  const info = estado.sessoes.find(s => s.session_id === sid)!.sheets[aba];
  const todas = info.columns as string[];
  const ocultas = estado.ocultas[`${sid}/${aba}`] || [];
  return { sheet_name: aba, columns: todas.filter(c => !ocultas.includes(c)), all_columns: todas, data: [], total_rows: info.row_count, page: 1, page_size: 50, total_pages: 1 };
};

beforeEach(() => {
  notify.mockReset();
  estado = {
    sessoes: [
      { session_id: 'S1', sheets: { a: { columns: ['k', 'x'], row_count: 1 }, b: { columns: ['k'], row_count: 1 } } },
      { session_id: 'S2', sheets: { a: { columns: ['k', 'x'], row_count: 1 } } },
      { session_id: 'S3', sheets: { a: { columns: ['k', 'x'], row_count: 2 } } },
    ],
    ocultas: { 'S1/a': ['x'] },
    status: {},
    toggleFalha: false,
    atrasos: {},
  };
  let uploads = 0;
  apiMock.get.mockImplementation(async (url: string) => {
    const pagina = url.match(/^\/analysis\/sheet\/([^/]+)\/([^/]+)$/);
    if (pagina) return { data: paginaDe(pagina[1], pagina[2]) };
    if (url.startsWith('/analysis/download/')) return { data: new Blob(['x']) };
    const status = url.match(/status\/(.+)$/);
    if (status) return { data: estado.status[status[1]] || { status: 'running' } };
    return { data: [] };
  });
  apiMock.post.mockImplementation(async (url: string, body: any) => {
    if (estado.atrasos[url] && !body?.dry_run) await estado.atrasos[url];
    if (url === '/analysis/upload') return { data: structuredClone(estado.sessoes[uploads++]) };
    if (url === '/analysis/run-compare') return { data: { task_id: 'T1' } };
    if (url === '/analysis/run-id-mapping') return { data: { task_id: 'M1' } };
    if (url === '/analysis/load-job-session/J1') return { data: {
      session_id: 'S3', sheets: { a: { columns: ['k', 'x'], row_count: 2 } },
      connected_job_id: 'J1', connected_job_info: { mutation_type: 'missense', dbpepmutref_rows: 2 },
    } };
    if (url === '/analysis/disconnect-job') {
      if (estado.toggleFalha) throw Object.assign(new Error('falhou'), { response: { status: 500, data: { detail: 'Falha ao desconectar' } } });
      return { data: { success: true } };
    }
    if (url === '/analysis/remove-contaminants') {
      if (body.dry_run) return { data: { dry_run: true, removed_count: 1, remaining_count: 1, sample_removed: ['x1'], sheet_version: 7 } };
      return { data: { message: '1 rows removed', data: paginaDe(body.session_id, body.sheet_name) } };
    }
    if (url === '/analysis/toggle-columns') {
      if (estado.toggleFalha) throw Object.assign(new Error('falhou'), { response: { status: 500, data: { detail: 'falhou' } } });
      estado.ocultas[`${body.session_id}/${body.sheet_name}`] = body.hidden_columns;
      return { data: { data: paginaDe(body.session_id, body.sheet_name) } };
    }
    if (url === '/analysis/import-files') {
      const sid = body.get('session_id');
      return { data: { sheets: { ...estado.sessoes.find(s => s.session_id === sid)!.sheets, vazou_data: { columns: ['p'], row_count: 1 } }, new_sheets: ['vazou_data'], message: 'importado' } };
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
    expect(ultimo[1]).toEqual({ session_id: 'S2', sheet_name: 'a', hidden_columns: ['k'], page: 1 });
  });
});

describe('contratos da tela de analise (C13)', () => {
  const ultimaPagina = () => apiMock.get.mock.calls.filter(c => String(c[0]).startsWith('/analysis/sheet/')).pop()!;

  it('busca vai ao servidor e vale para a aba inteira (I15)', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'NP_9' } });
    await esperar(500);
    expect(ultimaPagina()[1].params).toEqual({ page: 1, page_size: 50, search: 'NP_9' });
  });

  it('exportacao avisa que a busca nao se aplica ao arquivo (I15)', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('download'));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(
      'Export includes every row of every sheet. The search filter is not applied to the file.', 'info'));
  });

  it('remocao de contaminantes mostra previa e so grava depois da confirmacao (I15, I65)', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('contaminants'));
    fireEvent.click(screen.getByText('confirm-filter'));
    await waitFor(() => expect(screen.getByText('1 row(s) will be removed and 1 kept.')).toBeTruthy());
    const remocoes = () => apiMock.post.mock.calls.filter(c => c[0] === '/analysis/remove-contaminants');
    expect(remocoes()).toHaveLength(1);
    expect(remocoes()[0][1].dry_run).toBe(true);
    fireEvent.click(screen.getByText('Remove 1 row(s)'));
    await waitFor(() => expect(remocoes()).toHaveLength(2));
    expect(remocoes()[1][1].dry_run).toBeUndefined();
    // Confirmacao vale para a versao mostrada na previa (N03)
    expect(remocoes()[1][1].expected_version).toBe(7);
  });

  it('catalogo de abas acompanha colunas novas do servidor (I17)', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    expect(screen.getByTestId('cols-a').textContent).toBe('k,x');
    // Outra operacao acrescenta uma coluna na aba
    estado.sessoes[0].sheets.a.columns = ['k', 'x', 'Gene'];
    fireEvent.click(screen.getByText('tab-a'));
    await waitFor(() => expect(screen.getByTestId('cols-a').textContent).toBe('k,x,Gene'));
  });

  it('abrir Job como sessao absorve a conexao (I14)', async () => {
    render(<AnalysisTool />);
    fireEvent.click(screen.getByText('load-job'));
    await waitFor(() => expect(screen.getByTestId('job').textContent).toBe('J1|missense'));
    expect(screen.getByTestId('rows').textContent).toBe('2/2');
  });

  it('desconectar envia so a sessao e mostra falha (I13)', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    estado.toggleFalha = true;
    fireEvent.click(screen.getByText('disconnect'));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Falha ao desconectar', 'error'));
    const chamada = apiMock.post.mock.calls.find(c => c[0] === '/analysis/disconnect-job')!;
    expect(chamada[1]).toEqual({ session_id: 'S1' });
  });
});

describe('resposta da sessao anterior depois do New Analysis (C20)', () => {
  const novaSessao = async () => {
    fireEvent.click(screen.getByText('new'));
    await waitFor(() => expect(screen.getByText('upload')).toBeTruthy());
    await abrirSessao();
    await esperar(50);
  };

  it('remocao atrasada da sessao A nao muda a tabela da sessao B (F03)', async () => {
    const liberar = deferred<void>();
    estado.atrasos['/analysis/remove-contaminants'] = liberar.promise;
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('contaminants'));
    fireEvent.click(screen.getByText('confirm-filter'));
    await waitFor(() => expect(screen.getByText('Remove 1 row(s)')).toBeTruthy());
    fireEvent.click(screen.getByText('Remove 1 row(s)'));
    await novaSessao();
    estado.sessoes[0].sheets.a.row_count = 99;
    await act(async () => {
      liberar.resolve();
      await liberar.promise;
    });
    await esperar(50);
    expect(screen.getByTestId('rows').textContent).not.toContain('99');
    expect(notify).not.toHaveBeenCalledWith('1 rows removed', 'success');
  });

  it('importacao atrasada da sessao A nao cria aba na sessao B (F05)', async () => {
    const liberar = deferred<void>();
    estado.atrasos['/analysis/import-files'] = liberar.promise;
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('import'));
    await novaSessao();
    await act(async () => {
      liberar.resolve();
      await liberar.promise;
    });
    await esperar(50);
    expect(screen.getByTestId('tabs').textContent).toBe('a');
    expect(chamadas('/analysis/sheet/S2/vazou_data')).toBe(0);
  });

  it('importacao na propria sessao continua abrindo a aba nova', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.click(screen.getByText('import'));
    await waitFor(() => expect(screen.getByTestId('tabs').textContent).toBe('a,b,vazou_data'));
  });
});

describe('colunas com busca ativa (F04)', () => {
  it('alternar coluna envia a busca da tela', async () => {
    render(<AnalysisTool />);
    await abrirSessao();
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'PEPTIDE_TWO' } });
    await esperar(500);
    fireEvent.click(screen.getByText('toggle-k'));
    await esperar(50);
    const ultimo = apiMock.post.mock.calls.filter(c => c[0] === '/analysis/toggle-columns').pop()!;
    expect(ultimo[1]).toMatchObject({ session_id: 'S1', search: 'PEPTIDE_TWO', page: 1 });
  });
});
