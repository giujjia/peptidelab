// Revisao integral de 31/10/2026 (C21): nome de aba codificado no caminho da URL (V24)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSheetData } from '../src/hooks/useSheetData';
import { api } from '../src/services/api';

vi.mock('../src/services/api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

const page = (sheet: string) => ({
  data: { sheet_name: sheet, columns: ['x'], all_columns: ['x'], data: [], total_rows: 0, page: 1, page_size: 50, total_pages: 1 },
  status: 200,
});

describe('nome da aba no caminho (V24)', () => {
  it('caracteres especiais do nome da aba vao codificados', async () => {
    const { result } = renderHook(() => useSheetData(vi.fn(), vi.fn()));
    vi.mocked(api.post).mockResolvedValueOnce({ data: { session_id: 'S1', sheets: { 'results #1': { columns: ['x'], row_count: 0 } } }, status: 200 });
    vi.mocked(api.get).mockResolvedValue(page('results #1'));
    await act(async () => { await result.current.handleLoadExample(); });
    await act(async () => { await result.current.fetchSheetData('50% ?b'); });
    const urls = vi.mocked(api.get).mock.calls.map(c => String(c[0]));
    expect(urls).toContain('/analysis/sheet/S1/results%20%231');
    expect(urls).toContain('/analysis/sheet/S1/50%25%20%3Fb');
  });
});
