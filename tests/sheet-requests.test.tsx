// Resposta atrasada de uma aba nao substitui a aba pedida depois (revisao Ponytail de 27/10)
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSheetData } from '../src/hooks/useSheetData';
import { api } from '../src/services/api';
import { deferred } from './helpers';

vi.mock('../src/services/api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const pagina = (sheet: string) => ({
  data: { sheet_name: sheet, columns: ['x'], all_columns: ['x'], data: [{ x: sheet }], total_rows: 1, page: 1, page_size: 50, total_pages: 1 },
  status: 200,
});
const sessao = (id: string) => ({ data: { session_id: id, sheets: { a: { columns: ['x'], row_count: 1 }, b: { columns: ['x'], row_count: 1 } } }, status: 200 });

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

const abrir = async (id: string) => {
  const { result } = renderHook(() => useSheetData(vi.fn(), vi.fn()));
  vi.mocked(api.post).mockResolvedValueOnce(sessao(id));
  vi.mocked(api.get).mockResolvedValueOnce(pagina('a'));
  await act(async () => { await result.current.handleLoadExample(); });
  return result;
};

describe('pedidos de pagina', () => {
  it('ultima aba pedida prevalece quando a resposta anterior chega depois', async () => {
    const result = await abrir('S1');
    const respA = deferred<any>();
    const respB = deferred<any>();
    vi.mocked(api.get).mockImplementationOnce(() => respA.promise).mockImplementationOnce(() => respB.promise);
    let pedidoA!: Promise<void>;
    let pedidoB!: Promise<void>;
    act(() => {
      pedidoA = result.current.fetchSheetData('a');
      pedidoB = result.current.fetchSheetData('b');
    });
    await act(async () => { respB.resolve(pagina('b')); await pedidoB; });
    expect(result.current.activeSheet).toBe('b');
    await act(async () => { respA.resolve(pagina('a')); await pedidoA; });
    expect(result.current.activeSheet).toBe('b');
    expect(result.current.sheetData?.sheet_name).toBe('b');
    expect(result.current.loadingSheet).toBe(false);
  });

  it('pagina pedida antes de sair da sessao nao volta depois do New Analysis', async () => {
    const result = await abrir('S1');
    const resp = deferred<any>();
    vi.mocked(api.get).mockImplementationOnce(() => resp.promise);
    let pedido!: Promise<void>;
    act(() => { pedido = result.current.fetchSheetData('b'); });
    act(() => { result.current.resetWorkspace(); });
    await act(async () => { resp.resolve(pagina('b')); await pedido; });
    expect(result.current.sessionId).toBe('');
    expect(result.current.sheetData).toBeNull();
    expect(result.current.activeSheet).toBe('');
  });
});
