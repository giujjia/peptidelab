// Servidor sem ESM: botao desativado com aviso em vez de falhar no envio (C19)
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../src/components/analysis/Sidebar';

const props = {
  filteredDataLength: 1, totalRows: 1, connectedJobId: '', connectedJobInfo: null, availableJobs: [],
  connectingJob: false, filterLoading: false, filterDialogType: '', esmRunning: false, idMappingRunning: false,
  sheetData: { sheet_name: 'a', columns: ['k'], data: [{ k: 1 }], total_rows: 1, page: 1, page_size: 50, total_pages: 1 } as any,
  onConnectJob: vi.fn(), onDisconnectJob: vi.fn(), onFilterClick: vi.fn(), onFilterNumericClick: vi.fn(),
  onEsmClick: vi.fn(), onIdMappingClick: vi.fn(), onCompareClick: vi.fn(), onCrossValClick: vi.fn(), onResetFilters: vi.fn(),
};

describe('ESM opcional no servidor', () => {
  it('sem ESM o botao fica desativado e explica o motivo', () => {
    render(<Sidebar {...props} esmAvailable={false} />);
    expect(screen.getByRole('button', { name: /ESM-1v Score/ })).toHaveProperty('disabled', true);
    expect(screen.getByText('Not available on this server')).toBeTruthy();
  });

  it('com ESM o botao continua disponivel', () => {
    render(<Sidebar {...props} />);
    expect(screen.getByRole('button', { name: /ESM-1v Score/ })).toHaveProperty('disabled', false);
    expect(screen.queryByText('Not available on this server')).toBeNull();
  });
});
