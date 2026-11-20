// Revisao integral de 31/10/2026 (C21): varios UniProt por celula (V27), Jobs sem tabela de relacao (V28)
// e confirmacao ao excluir Job (V31)
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../src/services/api';
import { DataTable } from '../src/components/analysis/DataTable';
import { Sidebar } from '../src/components/analysis/Sidebar';
import { JobsDrawer } from '../src/components/analysis/JobsDrawer';
import { JobsList } from '../src/components/processor/JobsList';

vi.mock('../src/services/api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
// Usuario estavel: um objeto novo a cada render refaria a busca do historico sem parar
const { auth } = vi.hoisted(() => ({ auth: { user: { id: 'u' } } }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => auth }));

beforeEach(() => {
  vi.mocked(api.get).mockReset();
});

describe('celula com varios UniProt (V27)', () => {
  it('cada acesso vira um link proprio', () => {
    render(<DataTable loading={false} columns={['UniProt_ID']} data={[{ UniProt_ID: 'P04637|A0A024RBG1' }]} />);
    const links = screen.getAllByRole('link');
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      'https://www.uniprot.org/uniprotkb/P04637',
      'https://www.uniprot.org/uniprotkb/A0A024RBG1',
    ]);
  });

  it('virgula nao conta como acesso UniProt', () => {
    render(<DataTable loading={false} columns={['c']} data={[{ c: ',0A1234' }]} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

const sidebarProps = {
  filteredDataLength: 1, totalRows: 1, connectedJobId: '', connectedJobInfo: null,
  connectingJob: false, filterLoading: false, filterDialogType: '', esmRunning: false, idMappingRunning: false,
  sheetData: { sheet_name: 'a', columns: ['k'], data: [], total_rows: 1, page: 1, page_size: 50, total_pages: 1 } as any,
  onConnectJob: vi.fn(), onDisconnectJob: vi.fn(), onFilterClick: vi.fn(), onFilterNumericClick: vi.fn(),
  onEsmClick: vi.fn(), onIdMappingClick: vi.fn(), onCompareClick: vi.fn(), onCrossValClick: vi.fn(), onResetFilters: vi.fn(),
};

describe('Jobs sem tabela de relacao (V28)', () => {
  const frameshift = { id: 'f1234567', mutation_type: 'frameshift', created_at: new Date().toISOString(), has_dbpepmutref: false };

  it('lista so com frameshift avisa que nao ha Job para conectar', () => {
    render(<Sidebar {...sidebarProps} availableJobs={[frameshift]} />);
    expect(screen.getByText('No jobs available')).toBeTruthy();
  });

  it('historico nao oferece abrir nem conectar Job sem relacao', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: url === '/analysis/jobs' ? [frameshift] : [] }));
    render(<JobsDrawer open onClose={vi.fn()} onLoadJobAsSession={vi.fn()} onConnectJobToSession={vi.fn()} currentSessionId="S1" />);
    expect(await screen.findByText(/no peptide relation table/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open in Workspace/ })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Connect' })).toHaveProperty('disabled', true);
  });
});

describe('exclusao de Job (V31)', () => {
  const job = {
    id: 'j1', user_id: 'u', mutation_type: 'missense', input_mode: 'text', input_text: null, file_url: null,
    output_fasta_path: null, output_dbf_path: null, output_dbpepmutref_path: null, error_message: null,
    status: 'COMPLETED' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };

  const renderList = (onDeleteJob: (id: string) => void) => render(
    <MemoryRouter>
      <JobsList jobs={[job]} isAuthenticated currentMutationLabel="Missense"
        onViewJob={vi.fn()} onDownloadZip={vi.fn()} onDeleteJob={onDeleteJob} />
    </MemoryRouter>
  );

  it('so exclui depois da confirmacao', () => {
    const onDeleteJob = vi.fn();
    renderList(onDeleteJob);
    fireEvent.click(screen.getByTitle('Delete Job'));
    expect(onDeleteJob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Job' }));
    expect(onDeleteJob).toHaveBeenCalledWith('j1');
  });

  it('cancelar mantem o Job', () => {
    const onDeleteJob = vi.fn();
    renderList(onDeleteJob);
    fireEvent.click(screen.getByTitle('Delete Job'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDeleteJob).not.toHaveBeenCalled();
  });
});

describe('ESM-1v no JobsDrawer e em Recent Analysis Jobs', () => {
  const esmTask = {
    id: 't1',
    task_type: 'esm',
    session_id: 'sess-12345678',
    status: 'done',
    progress: 5,
    total: 5,
    created_at: new Date().toISOString(),
  };

  it('JobsDrawer mostra Download (.xlsx) para tarefa concluida e chama /analysis/download', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/analysis/tasks') return { data: [esmTask] };
      if (url === `/analysis/download/${esmTask.session_id}`) return { data: new Blob(['x']) };
      return { data: [] };
    });
    const origCreateObjectURL = window.URL.createObjectURL;
    const origRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    try {
      render(<JobsDrawer open onClose={vi.fn()} onLoadJobAsSession={vi.fn()} onOpenSession={vi.fn()} />);
      fireEvent.click(await screen.findByRole('tab', { name: /Background Tasks/ }));
      const btn = await screen.findByRole('button', { name: /Download \(\.xlsx\)/ });
      fireEvent.click(btn);
      expect(api.get).toHaveBeenCalledWith(`/analysis/download/${esmTask.session_id}`, { responseType: 'blob' });
    } finally {
      window.URL.createObjectURL = origCreateObjectURL;
      window.URL.revokeObjectURL = origRevokeObjectURL;
    }
  });

  it('Recent Analysis Jobs lista tarefas ESM-1v com botoes Open e XLSX', () => {
    const onOpenTaskSession = vi.fn();
    const onDownloadTaskSession = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <JobsList
          jobs={[]}
          analysisTasks={[esmTask]}
          isAuthenticated
          currentMutationLabel="Missense"
          onViewJob={vi.fn()}
          onDownloadZip={vi.fn()}
          onOpenTaskSession={onOpenTaskSession}
          onDownloadTaskSession={onDownloadTaskSession}
        />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('tab', { name: /Analysis Tasks \(1\)/ }));
    expect(screen.getByText('ESM-1v Scoring')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpenTaskSession).toHaveBeenCalledWith(esmTask.session_id);
    fireEvent.click(screen.getByRole('button', { name: 'XLSX' }));
    expect(onDownloadTaskSession).toHaveBeenCalledWith(esmTask.session_id);
  });
});
