import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { FilterPopover } from '../components/analysis/FilterPopover';
import { EsmPopover } from '../components/analysis/EsmPopover';
import { IdMappingPopover } from '../components/analysis/IdMappingPopover';
import { ComparePopover } from '../components/analysis/ComparePopover';
import { CrossValPopover } from '../components/analysis/CrossValPopover';
import { JobsDrawer } from '../components/analysis/JobsDrawer';
import { AvailableJob } from '../types';

import { useSheetData } from '../hooks/useSheetData';
import { useColumnVisibility } from '../hooks/useColumnVisibility';

import { UploadScreen } from '../components/analysis/UploadScreen';
import { Sidebar } from '../components/analysis/Sidebar';
import { HeaderBar } from '../components/analysis/HeaderBar';
import { SheetTabs } from '../components/analysis/SheetTabs';
import { DataTable } from '../components/analysis/DataTable';
import { PaginationControl } from '../components/analysis/PaginationControl';
import { TaskProgressWidget, TaskInfo } from '../components/common/TaskProgressWidget';
import { useTaskPolling, TrackedTask, TaskOutcome } from '../hooks/useTaskPolling';
import { RemovalConfirmDialog, RemovalPreview } from '../components/analysis/RemovalConfirmDialog';
import { errorMessage } from '../services/errors';

const FILTER_CONFIG = {
  'add-genes': { title: 'Add Gene Information', description: 'Maps gene symbols from your protein identifiers (e.g. NP_ or NM_ accessions) using the copy of NCBI gene2refseq stored on the server.' },
  'add-protein-id': { title: 'Add Protein ID', description: 'Matches sequences from this active sheet to your connected Job\'s database to automatically retrieve their Protein IDs.' },
  'remove-contaminants': { title: 'Remove Contaminants', description: 'Scans the selected column and permanently deletes rows matching a regular expression. You confirm after seeing how many rows match.' },
  'filter-numeric': { title: 'Filter Numeric', description: 'Filters the selected numerical column based on an operator and threshold.' },
};

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const AnalysisTool: React.FC = () => {
  const { notify } = useNotification();
  const { session: authSession, isLoading: authLoading } = useAuth();
  const identity = authSession?.access_token ?? null;
  const prevIdentityRef = useRef<string | null | undefined>(undefined);
  
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [jobsDrawerOpen, setJobsDrawerOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!identity) {
      setAvailableJobs([]);
      return;
    }
    try {
      const res = await api.get('/analysis/jobs');
      setAvailableJobs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, [identity]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Servidor sem ESM instalado mostra o botao desativado em vez de falhar no envio
  const [esmAvailable, setEsmAvailable] = useState(true);
  const [esmMaxRows, setEsmMaxRows] = useState(200);
  useEffect(() => {
    let ativo = true;
    api.get('/analysis/capabilities')
      .then(res => {
        if (!ativo) return;
        if (res?.data?.esm === false) setEsmAvailable(false);
        if (typeof res?.data?.esm_max_rows === 'number') setEsmMaxRows(res.data.esm_max_rows);
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  const {
    sessionId, sheetsInfo, activeSheet, sheetData, loadingSheet, uploading,
    setSheetsInfo, setSheetData, fetchSheetData, handleUpload, handleImportFiles, handleLoadExample, handleLoadCompareExample, handleLoadJobSession, handleReopenSession, handleDownload, resetWorkspace, handleDeleteSession,
    searchQuery, setSearchQuery
  } = useSheetData(notify, fetchJobs);

  const {
    hiddenColumns, handleToggleColumn, handleShowAll, handleHideAll
  } = useColumnVisibility(sessionId, activeSheet, sheetData, setSheetData, notify, searchQuery);


  // Sessao exibida agora, para descartar respostas de pedidos iniciados antes do New Analysis
  const currentSessionRef = useRef(sessionId);
  currentSessionRef.current = sessionId;

  // Job connection
  const [connectedJobId, setConnectedJobId] = useState('');
  const [connectedJobInfo, setConnectedJobInfo] = useState<{ mutation_type: string; dbpepmutref_rows: number } | null>(null);
  const [connectingJob, setConnectingJob] = useState(false);

  // Filters State
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [filterDialogType, setFilterDialogType] = useState<'add-genes' | 'add-protein-id' | 'remove-contaminants' | 'filter-numeric'>('add-genes');
  const [filterLoading, setFilterLoading] = useState(false);

  // ESM-1v State
  const [esmAnchorEl, setEsmAnchorEl] = useState<null | HTMLElement>(null);
  const [esmTask, setEsmTask] = useState<TaskInfo | null>(null);
  const [esmTrackedTask, setEsmTrackedTask] = useState<TrackedTask | null>(null);
  const [esmStarting, setEsmStarting] = useState(false);

  // ID Mapping & Compare State
  const [idMappingAnchorEl, setIdMappingAnchorEl] = useState<null | HTMLElement>(null);
  const [idMappingTask, setIdMappingTask] = useState<TrackedTask | null>(null);
  const [idMappingStarting, setIdMappingStarting] = useState(false);
  const [compareAnchorEl, setCompareAnchorEl] = useState<null | HTMLElement>(null);
  const [crossValAnchorEl, setCrossValAnchorEl] = useState<null | HTMLElement>(null);
  const [compareTask, setCompareTask] = useState<TrackedTask | null>(null);

  // Resultado de tarefa so altera a tela se ela ainda mostra a sessao de origem
  const notifyOtherSession = (label: string, outcome: TaskOutcome) => {
    if (outcome === 'done') notify(`${label} finished in another session. Open it from Background Tasks.`, 'info');
  };

  useTaskPolling(
    esmTrackedTask,
    (task, outcome, data) => {
      setEsmTrackedTask(prev => (prev?.taskId === task.taskId ? null : prev));
      setEsmTask(prev => {
        if (!prev || prev.taskId !== task.taskId) return prev;
        if (outcome === 'lost') {
          return { ...prev, status: 'error', error: 'Polling stopped due to repeated network errors' };
        }
        return {
          ...prev,
          status: outcome,
          progress: data?.processed ?? prev.progress,
          total: data?.total ?? prev.total,
          error: data?.error,
        };
      });
      if (task.sessionId !== sessionId) {
        notifyOtherSession('ESM-1v scoring', outcome);
        return;
      }
      if (outcome === 'done') {
        if (task.sheetName === activeSheet) {
          notify('ESM-1v scoring complete!', 'success');
          fetchSheetData(activeSheet, sheetData?.page || 1);
        } else if (task.sheetName) {
          notify(`ESM-1v scoring complete! Results ready on sheet "${task.sheetName}"`, 'success');
        }
      } else if (outcome === 'error') {
        notify(`ESM-1v Error: ${data?.error || 'Execution failed'}`, 'error');
      } else if (outcome === 'cancelled') {
        notify('ESM-1v scoring cancelled', 'info');
      } else {
        notify('ESM-1v polling stopped due to network errors', 'error');
      }
    },
    2000,
    5,
    (task, data) => {
      setEsmTask(prev => {
        if (!prev || prev.taskId !== task.taskId) return prev;
        return {
          ...prev,
          status: data.status,
          progress: data.processed ?? prev.progress,
          total: data.total ?? prev.total,
          error: data.error,
        };
      });
    }
  );

  // Indicador de ID Mapping e ESM valem so para a sessao que iniciou a tarefa
  const idMappingRunning = idMappingStarting || (!!idMappingTask && idMappingTask.sessionId === sessionId);
  const esmRunning = esmStarting || (!!esmTask && esmTask.sessionId === sessionId && (esmTask.status === 'pending' || esmTask.status === 'running'));

  useTaskPolling(idMappingTask, (task, outcome, data) => {
    setIdMappingTask(prev => (prev?.taskId === task.taskId ? null : prev));
    if (task.sessionId !== sessionId) {
      notifyOtherSession('UniProt ID Mapping', outcome);
      return;
    }
    if (outcome === 'done') {
      notify('UniProt ID Mapping complete!', 'success');
      if (task.sheetName === activeSheet) {
        fetchSheetData(activeSheet, sheetData?.page || 1);
      } else if (task.sheetName) {
        notify(`Results ready on sheet "${task.sheetName}"`, 'info');
      }
    } else if (outcome === 'error') {
      const errDetail = typeof data?.error === 'string' ? data.error : 'ID Mapping processing error';
      notify(`ID Mapping Error: ${errDetail}`, 'error');
    } else if (outcome === 'cancelled') {
      notify('ID Mapping cancelled', 'info');
    } else {
      notify('ID Mapping polling stopped due to network errors', 'error');
    }
  });

  useTaskPolling(compareTask, (task, outcome, data) => {
    setCompareTask(prev => (prev?.taskId === task.taskId ? null : prev));
    if (task.sessionId !== sessionId) {
      notifyOtherSession('Comparison', outcome);
      return;
    }
    if (outcome === 'done') {
      notify(`Comparison complete! New tab: "${data.nova_aba}"`, 'success');
      if (data.nova_aba) {
        setSheetsInfo((prev: any) => ({
          ...prev,
          [data.nova_aba]: { row_count: 0, columns: [] }
        }));
        fetchSheetData(data.nova_aba, 1);
      }
    } else if (outcome === 'error') {
      notify(`Compare Error: ${data?.error}`, 'error');
    } else if (outcome === 'cancelled') {
      notify('Comparison cancelled', 'info');
    } else {
      notify('Comparison polling stopped due to network errors', 'error');
    }
  });

  const handleConnectJob = async (jobId: string): Promise<boolean> => {
    if (!jobId || !sessionId) return false;
    const origin = sessionId;
    setConnectingJob(true);
    try {
      const res = await api.post('/analysis/connect-job', {
        session_id: origin,
        job_id: jobId,
      });
      // Resposta que chega depois do New Analysis pertence a sessao anterior
      if (currentSessionRef.current !== origin) return false;
      setConnectedJobId(jobId);
      setConnectedJobInfo({
        mutation_type: res.data.mutation_type,
        dbpepmutref_rows: res.data.dbpepmutref_rows,
      });
      notify('Job connected to active session successfully!', 'success');
      return true;
    } catch (err: any) {
      if (currentSessionRef.current === origin) notify(errorMessage(err, 'Failed to connect job'), 'error');
      return false;
    } finally {
      setConnectingJob(false);
    }
  };

  const handleOpenSession = useCallback(async (targetSessionId: string): Promise<boolean> => {
    const data = await handleReopenSession(targetSessionId);
    if (data) {
      setConnectedJobId(data.connected_job_id || '');
      setConnectedJobInfo(data.connected_job_info || null);
      return true;
    }
    return false;
  }, [handleReopenSession]);

  const handleLoadJob = async (jobId: string): Promise<boolean> => {
    const data = await handleLoadJobSession(jobId);
    if (data) {
      setConnectedJobId(data.connected_job_id || '');
      setConnectedJobInfo(data.connected_job_info || null);
      return true;
    }
    return false;
  };

  // Busca no servidor com pequena espera entre teclas
  const searchFetchRef = useRef({ fetchSheetData, activeSheet, sessionId });
  searchFetchRef.current = { fetchSheetData, activeSheet, sessionId };
  const firstSearchRef = useRef(true);
  useEffect(() => {
    if (firstSearchRef.current) {
      firstSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const { fetchSheetData: fetchPage, activeSheet: sheet, sessionId: sid } = searchFetchRef.current;
      if (sid && sheet) fetchPage(sheet, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Link do email traz ?session_id=; abre depois que a autenticacao foi restaurada
  const sessionFromLinkRef = useRef(false);
  useEffect(() => {
    if (authLoading || sessionFromLinkRef.current) return;
    sessionFromLinkRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const linkSessionId = params.get('session_id');
    if (!linkSessionId) return;
    params.delete('session_id');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    if (!SAFE_SESSION_ID.test(linkSessionId)) {
      notify('Invalid session link', 'error');
      return;
    }
    handleOpenSession(linkSessionId);
  }, [authLoading, handleOpenSession, notify]);

  // Limpa workspace e tarefas quando a identidade muda (logout ou troca de conta em outra aba)
  useEffect(() => {
    if (prevIdentityRef.current === undefined) {
      prevIdentityRef.current = identity;
      return;
    }
    if (prevIdentityRef.current !== identity) {
      prevIdentityRef.current = identity;
      resetWorkspace();
      setConnectedJobId('');
      setConnectedJobInfo(null);
      setAvailableJobs([]);
      setPendingRemoval(null);
      setEsmTask(null);
      setEsmTrackedTask(null);
      setIdMappingTask(null);
      setCompareTask(null);
    }
  }, [identity, resetWorkspace]);

  const handleDisconnectJob = async () => {
    if (!sessionId) return;
    const origin = sessionId;
    try {
      await api.post('/analysis/disconnect-job', { session_id: origin });
      if (currentSessionRef.current !== origin) return;
      setConnectedJobId('');
      setConnectedJobInfo(null);
      notify('Job disconnected', 'info');
    } catch (err: any) {
      if (currentSessionRef.current === origin) notify(errorMessage(err, 'Failed to disconnect job'), 'error');
    }
  };

  const handleFilterClick = (e: React.MouseEvent<HTMLElement>, type: 'add-genes' | 'add-protein-id' | 'remove-contaminants' | 'filter-numeric') => {
    setFilterDialogType(type);
    setFilterAnchorEl(e.currentTarget);
  };

  // Edicao que devolve a aba atualizada; 409 recarrega a aba para repetir sobre a versao atual

  const applyEdit = async (url: string, body: Record<string, any>, errorFallback: string) => {
    setFilterLoading(true);
    const sameSession = () => currentSessionRef.current === body.session_id;
    try {
      const res = await api.post(url, body);
      if (!sameSession()) return;
      if (res?.data?.data) {
        setSheetData(res.data.data);
        notify(res.data.message, 'success');
      }
    } catch (err: any) {
      if (!sameSession()) return;
      if (err.response?.status === 409) {
        notify('This sheet was changed by another operation. It has been reloaded, please apply the action again.', 'warning');
        fetchSheetData(activeSheet, sheetData?.page || 1);
      } else {
        notify(errorMessage(err, errorFallback), 'error');
      }
    } finally {
      setFilterLoading(false);
    }
  };

  const [pendingRemoval, setPendingRemoval] = useState<{
    url: string; body: Record<string, any>; description: string; preview: RemovalPreview; sessionId: string;
  } | null>(null);

  const handleFilterConfirm = async (params: Record<string, string>) => {
    setFilterAnchorEl(null);
    if (!sessionId) return;
    const base = { session_id: sessionId, sheet_name: activeSheet };

    if (filterDialogType === 'filter-numeric' || filterDialogType === 'remove-contaminants') {
      let url: string;
      let body: Record<string, any>;
      let description: string;
      if (filterDialogType === 'filter-numeric') {
        const thresholdNum = parseFloat(params.threshold);
        const threshold = isNaN(thresholdNum) ? 0.01 : thresholdNum;
        url = '/analysis/filter-numeric';
        body = { ...base, target_column: params.target_column, operator: params.operator, threshold };
        description = `Keep only rows where "${params.target_column}" ${params.operator} ${threshold}.`;
      } else {
        const keyword = params.keyword || 'contaminant';
        url = '/analysis/remove-contaminants';
        body = { ...base, target_column: params.target_column, keyword };
        description = `Remove rows where "${params.target_column}" matches the regular expression /${keyword}/ (case insensitive).`;
      }
      // Previa sem gravar: o usuario confirma vendo quantas linhas saem
      const origin = sessionId;
      setFilterLoading(true);
      try {
        const { data: preview } = await api.post(url, { ...body, dry_run: true });
        if (currentSessionRef.current === origin) {
          setPendingRemoval({ url, body, description, preview, sessionId: origin });
        }
      } catch (err: any) {
        if (currentSessionRef.current === origin) notify(errorMessage(err, 'Failed to preview filter'), 'error');
      } finally {
        setFilterLoading(false);
      }
      return;
    }

    if (filterDialogType === 'add-genes') {
      await applyEdit('/analysis/add-genes', { ...base, target_column: params.target_column }, 'Failed to add genes');
    } else if (filterDialogType === 'add-protein-id') {
      const targetCol = params.target_sequence_column || params.target_column;
      await applyEdit('/analysis/add-protein-id', {
        ...base, target_sheet: activeSheet, target_sequence_column: targetCol, target_column: targetCol,
      }, 'Failed to add protein IDs');
    }
  };

  const handleConfirmRemoval = async () => {
    const pending = pendingRemoval;
    setPendingRemoval(null);
    // Previa de outra sessao nao e aplicada
    if (!pending || pending.sessionId !== sessionId) return;
    // Remocao vale para a versao da aba mostrada na previa; se outra aba mudou a planilha, volta 409
    await applyEdit(pending.url, { ...pending.body, expected_version: pending.preview.sheet_version ?? null }, 'Failed to apply filter');
  };

  const handleEsmClick = (e: React.MouseEvent<HTMLElement>) => {
    setEsmAnchorEl(e.currentTarget);
  };

  const handleEsmConfirm = async (params: {
    col_sequence: string;
    col_position: string;
    col_old_aa: string;
    col_new_aa: string;
    notify_email?: boolean;
  }) => {
    if (esmStarting) return;
    setEsmAnchorEl(null);
    setEsmStarting(true);
    const origin = { sessionId, sheetName: activeSheet };
    try {
      const res = await api.post('/analysis/run-esm1v', {
        session_id: origin.sessionId,
        sheet_name: origin.sheetName,
        ...params,
      });
      const taskId = res.data.task_id;
      setEsmTask({
        taskId,
        taskType: 'esm',
        status: 'pending',
        progress: 0,
        total: res.data.total_rows,
        sheetName: origin.sheetName,
        sessionId: origin.sessionId,
      });
      setEsmTrackedTask({
        taskId,
        sessionId: origin.sessionId,
        sheetName: origin.sheetName,
        statusUrl: `/analysis/task/${encodeURIComponent(taskId)}`,
      });
      notify('ESM-1v task scheduled successfully in background!', 'success');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to start ESM-1v'), 'error');
    } finally {
      setEsmStarting(false);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.post(`/analysis/task/${encodeURIComponent(taskId)}/cancel`);
      setEsmTrackedTask((prev) => (prev?.taskId === taskId ? null : prev));
      setEsmTask((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      notify('Task cancelled', 'info');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to cancel task'), 'error');
    }
  };

  const handleIdMappingConfirm = async (col_origin: string) => {
    setIdMappingAnchorEl(null);
    setIdMappingStarting(true);
    const origin = { sessionId, sheetName: activeSheet };
    try {
      const res = await api.post('/analysis/run-id-mapping', {
        session_id: origin.sessionId,
        sheet_name: origin.sheetName,
        col_origin,
      });
      const taskId = res.data.task_id;
      setIdMappingTask({ taskId, ...origin, statusUrl: `/analysis/id-mapping-status/${encodeURIComponent(taskId)}` });
      notify('UniProt ID Mapping running in background...', 'info');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to start ID Mapping'), 'error');
    } finally {
      setIdMappingStarting(false);
    }
  };

  const handleCompareConfirm = async (params: { sheet_a: string; sheet_b: string; col_key: string }) => {
    setCompareAnchorEl(null);
    try {
      const origin = sessionId;
      const res = await api.post('/analysis/run-compare', {
        session_id: origin,
        ...params,
      });
      setCompareTask({ taskId: res.data.task_id, sessionId: origin, statusUrl: `/analysis/compare-status/${encodeURIComponent(res.data.task_id)}` });
      notify('Comparing datasets in background...', 'info');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to start comparison'), 'error');
    }
  };

  const handleCrossValConfirm = async (params: { 
    sheet_a: string; 
    sheet_b: string; 
    join_keys: string[];
    score_col_a: string;
    score_col_b: string;
    margin_percentage: number;
    higher_is_better: boolean;
    classification_threshold: number;
  }) => {
    setCrossValAnchorEl(null);
    try {
      const origin = sessionId;
      const res = await api.post('/analysis/run-crossval', {
        session_id: origin,
        ...params,
      });
      setCompareTask({ taskId: res.data.task_id, sessionId: origin, statusUrl: `/analysis/compare-status/${encodeURIComponent(res.data.task_id)}` });
      notify('Cross-validation started in background...', 'info');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to start cross-validation'), 'error');
    }
  };

  const clearWorkspaceState = () => {
    setSearchQuery('');
    setConnectedJobId('');
    setConnectedJobInfo(null);
  };

  // Novo workspace; a sessao anterior continua no servidor e reabrivel pelo historico durante a retencao
  const handleNewAnalysis = () => {
    resetWorkspace();
    clearWorkspaceState();
    notify('Previous session kept. Sessions with background tasks can be reopened from Background Tasks while they are retained.', 'info');
  };

  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  const handleConfirmDeleteSession = async () => {
    setDeletingSession(true);
    try {
      if (await handleDeleteSession()) {
        clearWorkspaceState();
        setConfirmDeleteSession(false);
        notify('Session deleted', 'success');
      }
    } finally {
      setDeletingSession(false);
    }
  };

  const jobsDrawer = (
    <JobsDrawer
      open={jobsDrawerOpen}
      onClose={() => setJobsDrawerOpen(false)}
      onLoadJobAsSession={handleLoadJob}
      onConnectJobToSession={handleConnectJob}
      currentSessionId={sessionId}
      connectedJobId={connectedJobId}
      onRefreshActiveSheet={() => fetchSheetData(activeSheet, sheetData?.page || 1)}
      onOpenSession={handleOpenSession}
    />
  );

  if (!sessionId) {
    return (
      <>
        <UploadScreen 
          uploading={uploading} 
          onUpload={handleUpload} 
          onLoadExample={handleLoadExample}
          onLoadCompareExample={handleLoadCompareExample}
          onOpenJobsDrawer={() => setJobsDrawerOpen(true)}
        />
        {jobsDrawer}
      </>
    );
  }

  // Busca ja aplicada pelo servidor na aba inteira
  const filteredData = sheetData?.data ?? [];

  const allColumns = sheetData?.all_columns ?? [];
  const currentHiddenColumns = hiddenColumns[activeSheet] || [];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <Sidebar 
        filteredDataLength={sheetData?.total_rows ?? 0}
        totalRows={sheetsInfo[activeSheet]?.row_count}
        sheetData={sheetData}
        connectedJobId={connectedJobId}
        connectedJobInfo={connectedJobInfo}
        availableJobs={availableJobs}
        connectingJob={connectingJob}
        filterLoading={filterLoading}
        filterDialogType={filterDialogType}
        esmRunning={esmRunning}
        idMappingRunning={idMappingRunning}
        onConnectJob={handleConnectJob}
        onDisconnectJob={handleDisconnectJob}
        onFilterClick={handleFilterClick}
        onFilterNumericClick={(e) => handleFilterClick(e, 'filter-numeric')}
        onEsmClick={handleEsmClick}
        esmAvailable={esmAvailable}
        onIdMappingClick={(e) => setIdMappingAnchorEl(e.currentTarget)}
        onCompareClick={(e) => setCompareAnchorEl(e.currentTarget)}
        onCrossValClick={(e) => setCrossValAnchorEl(e.currentTarget)}
        onResetFilters={() => setSearchQuery('')}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
        <HeaderBar 
          sheetName={activeSheet}
          totalRows={sheetData?.total_rows ?? 0}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredColumns={allColumns}
          hiddenColumns={currentHiddenColumns}
          onToggleColumn={handleToggleColumn}
          onShowAllColumns={handleShowAll}
          onHideAllColumns={() => handleHideAll(allColumns)}
          onDownload={handleDownload}
          onNewAnalysis={handleNewAnalysis}
          onDeleteSession={() => setConfirmDeleteSession(true)}
          onOpenJobsDrawer={() => setJobsDrawerOpen(true)}
          onImportFiles={handleImportFiles}
        />

        <SheetTabs 
          sheetsInfo={sheetsInfo}
          activeSheet={activeSheet}
          onChange={(sheet) => fetchSheetData(sheet, 1)}
        />

        <DataTable 
          loading={loadingSheet}
          columns={sheetData?.columns ?? []}
          data={filteredData}
        />

        {sheetData && !loadingSheet && (
          <PaginationControl 
            page={sheetData.page}
            totalPages={sheetData.total_pages}
            totalRows={sheetData.total_rows}
            onChange={(p) => fetchSheetData(activeSheet, p)}
          />
        )}
      </Box>

      <FilterPopover
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        onConfirm={handleFilterConfirm}
        title={FILTER_CONFIG[filterDialogType].title}
        description={FILTER_CONFIG[filterDialogType].description}
        columns={sheetData?.all_columns || []}
        type={filterDialogType}
      />

      <EsmPopover
        anchorEl={esmAnchorEl}
        onClose={() => setEsmAnchorEl(null)}
        onConfirm={handleEsmConfirm}
        columns={sheetData?.all_columns || []}
        totalRows={sheetsInfo[activeSheet]?.row_count ?? sheetData?.total_rows ?? 0}
        maxRows={esmMaxRows}
      />

      <TaskProgressWidget
        task={esmTask && esmTask.sessionId === sessionId ? esmTask : null}
        onCancel={handleCancelTask}
        onRefreshResults={() => {
          if (esmTask && esmTask.sessionId === sessionId) {
            fetchSheetData(esmTask.sheetName || activeSheet, sheetData?.page || 1);
          }
        }}
        onDismiss={() => setEsmTask(null)}
      />

      <IdMappingPopover
        anchorEl={idMappingAnchorEl}
        onClose={() => setIdMappingAnchorEl(null)}
        onConfirm={({ col_origin }) => handleIdMappingConfirm(col_origin)}
        columns={sheetData?.all_columns || []}
      />

      <ComparePopover
        anchorEl={compareAnchorEl}
        onClose={() => setCompareAnchorEl(null)}
        onConfirm={handleCompareConfirm}
        sheets={Object.keys(sheetsInfo)}
        activeSheet={activeSheet}
        sheetsInfo={sheetsInfo}
      />

      <CrossValPopover
        anchorEl={crossValAnchorEl}
        onClose={() => setCrossValAnchorEl(null)}
        onConfirm={handleCrossValConfirm}
        sheets={Object.keys(sheetsInfo)}
        activeSheet={activeSheet}
        sheetsInfo={sheetsInfo}
      />

      <Dialog open={confirmDeleteSession} onClose={() => !deletingSession && setConfirmDeleteSession(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this session?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            All sheets and results of this session are removed from the server now and cannot be reopened from Background Tasks.
            To start another analysis and keep this one, use New Analysis instead.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteSession(false)} color="inherit" disabled={deletingSession} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleConfirmDeleteSession} color="error" variant="contained" disabled={deletingSession} sx={{ textTransform: 'none' }}>
            {deletingSession ? 'Deleting...' : 'Delete Session'}
          </Button>
        </DialogActions>
      </Dialog>

      <RemovalConfirmDialog
        open={!!pendingRemoval}
        description={pendingRemoval?.description || ''}
        preview={pendingRemoval?.preview || null}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={handleConfirmRemoval}
      />

      {jobsDrawer}
    </Box>
  );
};
