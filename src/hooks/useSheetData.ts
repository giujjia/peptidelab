import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { errorMessage } from '../services/errors';
import { downloadSessionWorkbook } from '../utils/download';
import { SheetInfo, SheetData } from '../types';

// Formato unico de sessao aberta (upload, Job carregado ou reabertura)
export interface SessionResponse {
  session_id: string;
  sheets: Record<string, SheetInfo>;
  connected_job_id?: string | null;
  connected_job_info?: { mutation_type: string; dbpepmutref_rows: number } | null;
}

export function useSheetData(notify: (msg: string, type?: 'success' | 'error' | 'info') => void, fetchJobs: () => void) {
  const [sessionId, setSessionId] = useState('');
  const [sheetsInfo, setSheetsInfo] = useState<Record<string, SheetInfo>>({});
  const [activeSheet, setActiveSheet] = useState('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Busca vale para a aba inteira no servidor, nao so para a pagina carregada
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef('');
  searchRef.current = searchQuery;
  const lastLoadedSearchedRef = useRef(false);

  // Catalogo de abas acompanha colunas e total confirmados pelo servidor apos cada operacao
  useEffect(() => {
    const name = sheetData?.sheet_name;
    if (!name) return;
    setSheetsInfo(prev => {
      const rowCount = lastLoadedSearchedRef.current ? prev[name]?.row_count ?? sheetData.total_rows : sheetData.total_rows;
      return { ...prev, [name]: { ...prev[name], columns: sheetData.all_columns, row_count: rowCount } };
    });
  }, [sheetData]);

  // So a pagina do pedido mais recente, e da sessao atual, chega a tela
  const pedidoRef = useRef(0);
  const sessaoRef = useRef('');
  const openSeqRef = useRef(0);

  const searchParams = () => {
    const q = searchRef.current.trim();
    return q ? { search: q } : {};
  };

  const processResponse = useCallback(async (data: any, openSeq?: number) => {
    if (openSeq !== undefined && openSeq !== openSeqRef.current) return false;
    setSearchQuery('');
    searchRef.current = '';
    lastLoadedSearchedRef.current = false;
    sessaoRef.current = data.session_id;
    const pedido = ++pedidoRef.current;
    setSessionId(data.session_id);
    setSheetsInfo(data.sheets);
    const firstSheet = Object.keys(data.sheets)[0];
    if (firstSheet) {
      setActiveSheet(firstSheet);
      setLoadingSheet(true);
      try {
        // Nome da aba vem do usuario; # % ? no caminho cortariam ou corromperiam a URL
        const res = await api.get(`/analysis/sheet/${encodeURIComponent(data.session_id)}/${encodeURIComponent(firstSheet)}`, {
          params: { page: 1, page_size: 50 }
        });
        if (pedido === pedidoRef.current) {
          lastLoadedSearchedRef.current = false;
          setSheetData(res.data);
        }
      } catch (err: any) {
        console.error(err);
        if (pedido === pedidoRef.current) notify(errorMessage(err, 'Failed to load sheet data'), 'error');
      } finally {
        if (pedido === pedidoRef.current) setLoadingSheet(false);
      }
    } else {
      setActiveSheet('');
      setSheetData(null);
    }
    fetchJobs();
    return true;
  }, [fetchJobs, notify]);

  const fetchSheetData = useCallback(async (sheet: string, page: number = 1) => {
    const pedido = ++pedidoRef.current;
    const atual = () => pedido === pedidoRef.current && sessaoRef.current === sessionId;
    const params = searchParams();
    const wasSearching = Boolean(params.search);
    setLoadingSheet(true);
    try {
      const res = await api.get(`/analysis/sheet/${encodeURIComponent(sessionId)}/${encodeURIComponent(sheet)}`, {
        params: { page, page_size: 50, ...params }
      });
      // Resposta de pedido anterior ou de outra sessao e descartada
      if (!atual()) return;
      lastLoadedSearchedRef.current = wasSearching;
      setSheetData(res.data);
      setActiveSheet(sheet);
    } catch (err: any) {
      console.error(err);
      if (atual()) notify(errorMessage(err, 'Failed to load sheet data'), 'error');
    } finally {
      if (pedido === pedidoRef.current) setLoadingSheet(false);
    }
  }, [sessionId, notify]);

  const handleUpload = async (files: File[]) => {
    const seq = ++openSeqRef.current;
    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    try {
      const res = await api.post('/analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await processResponse(res.data, seq);
    } catch (err: any) {
      if (seq === openSeqRef.current) notify(errorMessage(err, 'Upload failed'), 'error');
    } finally {
      if (seq === openSeqRef.current) setUploading(false);
    }
  };

  const handleImportFiles = async (files: File[]) => {
    if (!sessionId || files.length === 0) return;
    const origin = sessionId;
    // Resposta que chega depois do New Analysis pertence a sessao anterior
    const sameSession = () => sessaoRef.current === origin;
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
      if (!sameSession()) return;
      setSheetsInfo(res.data.sheets);
      const firstNew = res.data.new_sheets?.[0];
      if (firstNew) {
        setActiveSheet(firstNew);
        await fetchSheetData(firstNew, 1);
      }
      notify(res.data.message || 'Files imported successfully!', 'success');
    } catch (err: any) {
      if (sameSession()) notify(errorMessage(err, 'Failed to import files'), 'error');
    } finally {
      if (sameSession()) setLoadingSheet(false);
    }
  };

  const handleLoadExample = async () => {
    const seq = ++openSeqRef.current;
    setUploading(true);
    try {
      const res = await api.post('/analysis/load-example');
      await processResponse(res.data, seq);
    } catch (err: any) {
      if (seq === openSeqRef.current) notify(errorMessage(err, 'Failed to load example'), 'error');
    } finally {
      if (seq === openSeqRef.current) setUploading(false);
    }
  };

  const handleLoadCompareExample = async () => {
    const seq = ++openSeqRef.current;
    setUploading(true);
    try {
      const res = await api.post('/analysis/load-compare-example');
      const applied = await processResponse(res.data, seq);
      if (applied) notify('Compare datasets (Round 1 vs Round 2) loaded successfully!', 'success');
    } catch (err: any) {
      if (seq === openSeqRef.current) notify(errorMessage(err, 'Failed to load compare example'), 'error');
    } finally {
      if (seq === openSeqRef.current) setUploading(false);
    }
  };

  const handleLoadJobSession = async (jobId: string) => {
    const seq = ++openSeqRef.current;
    setUploading(true);
    try {
      const res = await api.post(`/analysis/load-job-session/${encodeURIComponent(jobId)}`);
      const applied = await processResponse(res.data, seq);
      return applied ? (res.data as SessionResponse) : null;
    } catch (err: any) {
      if (seq === openSeqRef.current) notify(errorMessage(err, 'Failed to load job'), 'error');
      return null;
    } finally {
      if (seq === openSeqRef.current) setUploading(false);
    }
  };

  // Reabre sessao existente pelo historico de tarefas ou pelo link do email
  const handleReopenSession = async (targetSessionId: string) => {
    const seq = ++openSeqRef.current;
    setUploading(true);
    try {
      const res = await api.get(`/analysis/session/${encodeURIComponent(targetSessionId)}`);
      const applied = await processResponse(res.data, seq);
      return applied ? (res.data as SessionResponse) : null;
    } catch (err: any) {
      if (seq === openSeqRef.current) notify(errorMessage(err, 'Session not found or expired'), 'error');
      return null;
    } finally {
      if (seq === openSeqRef.current) setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!sessionId) return;
    try {
      await downloadSessionWorkbook(sessionId);
      notify('Export includes every row of every sheet. The search filter is not applied to the file.', 'info');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to download file'), 'error');
    }
  };

  // Sai do workspace atual sem apagar a sessao no servidor; ela segue a retencao e pode ser reaberta
  const resetWorkspace = useCallback(() => {
    // Pedidos em andamento deixam de valer ao sair da sessao
    openSeqRef.current += 1;
    pedidoRef.current += 1;
    sessaoRef.current = '';
    setUploading(false);
    setSessionId('');
    setSearchQuery('');
    setSheetsInfo({});
    setSheetData(null);
    setActiveSheet('');
  }, []);

  // Exclusao so por acao explicita do usuario; devolve false quando o servidor recusa
  const handleDeleteSession = async () => {
    if (!sessionId) return false;
    const origin = sessionId;
    try {
      await api.delete(`/analysis/session/${encodeURIComponent(origin)}`);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        if (sessaoRef.current === origin) notify(errorMessage(err, 'Failed to delete session'), 'error');
        return false;
      }
    }
    if (sessaoRef.current === origin) resetWorkspace();
    return true;
  };

  return {
    sessionId, sheetsInfo, activeSheet, sheetData, loadingSheet, uploading, searchQuery, setSearchQuery,
    setSheetsInfo, setSheetData, fetchSheetData, handleUpload, handleImportFiles, handleLoadExample, handleLoadCompareExample, handleLoadJobSession, handleReopenSession, handleDownload, resetWorkspace, handleDeleteSession,
  };
}
