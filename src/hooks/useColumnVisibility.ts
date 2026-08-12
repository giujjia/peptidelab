import { useState } from 'react';
import { api } from '../services/api';

export function useColumnVisibility(sessionId: string, activeSheet: string, setSheetData: (data: any) => void, notify: (msg: string, type?: 'success' | 'error' | 'info') => void) {
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, string[]>>({});

  const handleToggleColumn = async (col: string) => {
    const current = hiddenColumns[activeSheet] || [];
    const updated = current.includes(col)
      ? current.filter(c => c !== col)
      : [...current, col];
    setHiddenColumns(prev => ({ ...prev, [activeSheet]: updated }));
    try {
      const res = await api.post('/analysis/toggle-columns', {
        session_id: sessionId,
        sheet_name: activeSheet,
        hidden_columns: updated,
      });
      setSheetData(res.data.data);
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.detail || 'Failed to toggle column', 'error');
    }
  };

  const handleShowAll = async () => {
    setHiddenColumns(prev => ({ ...prev, [activeSheet]: [] }));
    try {
      const res = await api.post('/analysis/toggle-columns', {
        session_id: sessionId, sheet_name: activeSheet, hidden_columns: [],
      });
      setSheetData(res.data.data);
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.detail || 'Failed to show all columns', 'error');
    }
  };

  const handleHideAll = async (allColumns: string[]) => {
    setHiddenColumns(prev => ({ ...prev, [activeSheet]: allColumns }));
    try {
      const res = await api.post('/analysis/toggle-columns', {
        session_id: sessionId, sheet_name: activeSheet, hidden_columns: allColumns,
      });
      setSheetData(res.data.data);
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.detail || 'Failed to hide all columns', 'error');
    }
  };

  return { hiddenColumns, handleToggleColumn, handleShowAll, handleHideAll };
}
