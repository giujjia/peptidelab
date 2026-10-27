import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { downloadBlob } from '../utils/download';
import { SheetInfo, SheetData } from '../types';

export function useSheetData(notify: (msg: string, type?: 'success' | 'error' | 'info') => void, fetchJobs: () => void) {
  const [sessionId, setSessionId] = useState('');
  const [sheetsInfo, setSheetsInfo] = useState<Record<string, SheetInfo>>({});
  const [activeSheet, setActiveSheet] = useState('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [uploading, setUploading] = useState(false);

  const processResponse = useCallback(async (data: any) => {
    setSessionId(data.session_id);
    setSheetsInfo(data.sheets);
    const firstSheet = Object.keys(data.sheets)[0];
    if (firstSheet) {
      setActiveSheet(firstSheet);
      setLoadingSheet(true);
      try {
        const res = await api.get(`/analysis/sheet/${data.session_id}/${firstSheet}`, {
          params: { page: 1, page_size: 50 }
        });
        setSheetData(res.data);
      } catch (err: any) {
        console.error(err);
        notify(err.response?.data?.detail || 'Failed to load sheet data', 'error');
      } finally {
        setLoadingSheet(false);
      }
    }
    fetchJobs();
  }, [fetchJobs, notify]);

  const fetchSheetData = useCallback(async (sheet: string, page: number = 1) => {
    setLoadingSheet(true);
    try {
      const res = await api.get(`/analysis/sheet/${sessionId}/${sheet}`, {
        params: { page, page_size: 50 }
      });
      setSheetData(res.data);
      setActiveSheet(sheet);
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.detail || 'Failed to load sheet data', 'error');
    } finally {
      setLoadingSheet(false);
    }
  }, [sessionId, notify]);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    try {
      const res = await api.post('/analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await processResponse(res.data);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleImportFiles = async (files: File[]) => {
    if (!sessionId || files.length === 0) return;
    setLoadingSheet(true);
    const formData = new FormData();
    formData.append('session_id', sessionId);
    files.forEach(file => {
      formData.append('files', file);
    });
    try {
      const res = await api.post('/analysis/import-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSheetsInfo(res.data.sheets);
      const firstNew = res.data.new_sheets?.[0];
      if (firstNew) {
        setActiveSheet(firstNew);
        await fetchSheetData(firstNew, 1);
      }
      notify(res.data.message || 'Files imported successfully!', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to import files', 'error');
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleLoadExample = async () => {
    setUploading(true);
    try {
      const res = await api.post('/analysis/load-example');
      await processResponse(res.data);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to load example', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadCompareExample = async () => {
    setUploading(true);
    try {
      const res = await api.post('/analysis/load-compare-example');
      await processResponse(res.data);
      notify('Compare datasets (Round 1 vs Round 2) loaded successfully!', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to load compare example', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadJobSession = async (jobId: string) => {
    setUploading(true);
    try {
      const res = await api.post(`/analysis/load-job-session/${jobId}`);
      await processResponse(res.data);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to load job', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Reabre sessao existente pelo historico de tarefas ou pelo link do email
  const handleReopenSession = async (targetSessionId: string) => {
    setUploading(true);
    try {
      const res = await api.get(`/analysis/session/${targetSessionId}`);
      await processResponse(res.data);
      return res.data as { session_id: string; connected_job_id?: string | null };
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Session not found or expired', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/analysis/download/${sessionId}`, { responseType: 'blob' });
      downloadBlob(res.data, `analysis_${sessionId.slice(0, 8)}.xlsx`);
    } catch {
      notify('Failed to download file', 'error');
    }
  };

  const handleBack = async () => {
    try { await api.delete(`/analysis/session/${sessionId}`); } catch {}
    setSessionId('');
    setSheetsInfo({});
    setSheetData(null);
    setActiveSheet('');
  };

  const handleNumericFilter = async (target_column: string, operator: string, threshold: number) => {
    setLoadingSheet(true);
    try {
      const res = await api.post('/analysis/filter-numeric', {
        session_id: sessionId,
        sheet_name: activeSheet,
        target_column,
        operator,
        threshold
      });
      setSheetData(res.data.data);
      notify(res.data.message, 'success');
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Aba mudou em outra operacao; recarrega para o usuario repetir sobre a versao atual
        notify('This sheet was changed by another operation. It has been reloaded, please apply the filter again.', 'info');
        setLoadingSheet(false);
        await fetchSheetData(activeSheet, 1);
        return;
      }
      notify(err.response?.data?.detail || 'Failed to apply filter', 'error');
    } finally {
      setLoadingSheet(false);
    }
  };

  return {
    sessionId, sheetsInfo, activeSheet, sheetData, loadingSheet, uploading,
    setSheetsInfo, setSheetData, fetchSheetData, handleUpload, handleImportFiles, handleLoadExample, handleLoadCompareExample, handleLoadJobSession, handleReopenSession, handleDownload, handleBack,
    handleNumericFilter, processResponse
  };
}
