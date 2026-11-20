import { useRef } from 'react';
import { api } from '../services/api';
import { errorMessage } from '../services/errors';
import { SheetData } from '../types';

export function useColumnVisibility(
  sessionId: string,
  activeSheet: string,
  sheetData: SheetData | null,
  setSheetData: (data: any) => void,
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void,
  searchQuery = ''
) {
  // Ocultas vem sempre da ultima resposta do servidor para a aba atual, sem estado local paralelo
  const hidden = sheetData ? sheetData.all_columns.filter(c => !sheetData.columns.includes(c)) : [];
  const pendingRef = useRef(false);
  const contextRef = useRef({ sessionId, activeSheet });
  contextRef.current = { sessionId, activeSheet };

  const send = async (updated: string[], errorMsg: string) => {
    // Uma alteracao por vez, calculada sobre o estado confirmado
    if (pendingRef.current || !sessionId || !activeSheet) return;
    pendingRef.current = true;
    const origin = { sessionId, activeSheet };
    const sameContext = () =>
      contextRef.current.sessionId === origin.sessionId && contextRef.current.activeSheet === origin.activeSheet;
    try {
      const res = await api.post('/analysis/toggle-columns', {
        session_id: origin.sessionId,
        sheet_name: origin.activeSheet,
        hidden_columns: updated,
        // Mesma pagina e busca da tela, para a tabela filtrada nao virar a aba inteira
        page: sheetData?.page || 1,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      });
      if (sameContext()) setSheetData(res.data.data);
    } catch (err: any) {
      console.error(err);
      if (sameContext()) notify(errorMessage(err, errorMsg), 'error');
    } finally {
      pendingRef.current = false;
    }
  };

  const handleToggleColumn = (col: string) =>
    send(hidden.includes(col) ? hidden.filter(c => c !== col) : [...hidden, col], 'Failed to toggle column');

  const handleShowAll = () => send([], 'Failed to show all columns');

  const handleHideAll = (allColumns: string[]) => send(allColumns, 'Failed to hide all columns');

  return { hiddenColumns: { [activeSheet]: hidden } as Record<string, string[]>, handleToggleColumn, handleShowAll, handleHideAll };
}
