import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, LinearProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
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
  'add-genes': { title: 'Add Gene Information', description: 'Automatically fetches and maps gene symbols from the NCBI Entrez database based on your protein identifiers (e.g. GI or Locus).' },
  'add-protein-id': { title: 'Add Protein ID', description: 'Matches sequences from this active sheet to your connected Job\'s database to automatically retrieve their Protein IDs.' },
  'remove-contaminants': { title: 'Remove Contaminants', description: 'Scans the selected column and permanently deletes rows containing a specified keyword.' },
  'filter-numeric': { title: 'Filter Numeric', description: 'Filters the selected numerical column based on an operator and threshold.' },
};

export const AnalysisTool: React.FC = () => {
  const { notify } = useNotification();
  
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [jobsDrawerOpen, setJobsDrawerOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/analysis/jobs');
      setAvailableJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Servidor sem ESM instalado mostra o botao desativado em vez de falhar no envio
  const [esmAvailable, setEsmAvailable] = useState(true);
  useEffect(() => {
    let ativo = true;
    api.get('/analysis/capabilities')
      .then(res => { if (ativo && res?.data?.esm === false) setEsmAvailable(false); })
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

  // ID Mapping & Compare State
  const [idMappingAnchorEl, setIdMappingAnchorEl] = useState<null | HTMLElement>(null);
  const [idMappingTask, setIdMappingTask] = useState<TrackedTask | null>(null);
  const [idMappingStarting, setIdMappingStarting] = useState(false);
  const [compareAnchorEl, setCompareAnchorEl] = useState<null | HTMLElement>(null);
  const [crossValAnchorEl, setCrossValAnchorEl] = useState<null | HTMLElement>(null);
  const [compareTask, setCompareTask] = useState<TrackedTask | null>(null);

  // Polling para ESM-1v
  const isEsmPollingRef = useRef(false);
  const esmTaskId = esmTask?.taskId;
  const esmTaskStatus = esmTask?.status;
  const esmTaskSheet = esmTask?.sheetName;
  const esmTaskSession = esmTask?.sessionId;

  useEffect(() => {
    if (!esmTaskId || (esmTaskStatus !== 'pending' && esmTaskStatus !== 'running')) return;

    let failCount = 0;
    let isCancelled = false;

    const poll = async () => {
      if (isEsmPollingRef.current || isCancelled) return;
      isEsmPollingRef.current = true;

      try {
        const { data } = await api.get(`/analysis/task/${esmTaskId}`);
        if (isCancelled) return;

        failCount = 0;
        setEsmTask(prev => {
          if (!prev || prev.taskId !== esmTaskId) return prev;
          return {
            ...prev,
            status: data.status,
            progress: data.processed ?? prev.progress,
            total: data.total ?? prev.total,
            error: data.error,
          };
        });

        if (data.status === 'done') {
          notify('ESM-1v scoring complete!', 'success');
          if (esmTaskSession === sessionId && esmTaskSheet === activeSheet) {
            fetchSheetData(activeSheet, sheetData?.page || 1);
          } else if (esmTaskSheet) {
            notify(`Results ready on sheet "${esmTaskSheet}"`, 'info');
          }
        } else if (data.status === 'error') {
          notify(`ESM-1v Error: ${data.error || 'Execution failed'}`, 'error');
        }
      } catch {
        if (isCancelled) return;
        failCount++;
        if (failCount >= 5) {
          setEsmTask(prev => prev && prev.taskId === esmTaskId ? { ...prev, status: 'error', error: 'Polling stopped due to repeated network errors' } : prev);
          notify('ESM-1v polling stopped due to network errors', 'error');
        }
      } finally {
        isEsmPollingRef.current = false;
      }
    };

    const interval = setInterval(poll, 2000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      isEsmPollingRef.current = false;
    };
  }, [esmTaskId, esmTaskStatus, esmTaskSheet, esmTaskSession, sessionId, activeSheet, sheetData?.page, fetchSheetData, notify]);

  // Indicador de ID Mapping vale so para a sessao que iniciou a tarefa
  const idMappingRunning = idMappingStarting || (!!idMappingTask && idMappingTask.sessionId === sessionId);

  // Resultado de tarefa so altera a tela se ela ainda mostra a sessao de origem
  const notifyOtherSession = (label: string, outcome: TaskOutcome) => {
    if (outcome === 'done') notify(`${label} finished in another session. Open it from Background Tasks.`, 'info');
  };

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

  const handleConnectJob = async (jobId: string) => {
    if (!jobId || !sessionId) return;
    setConnectingJob(true);
    try {
      const res = await api.post('/analysis/connect-job', {
        session_id: sessionId,
        job_id: jobId,
      });
      setConnectedJobId(jobId);
      setConnectedJobInfo({
        mutation_type: res.data.mutation_type,
        dbpepmutref_rows: res.data.dbpepmutref_rows,
      });
      notify('Job connected to active session successfully!', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to connect job', 'error');
    } finally {
      setConnectingJob(false);
    }
  };

  const handleOpenSession = useCallback(async (targetSessionId: string) => {
    const data = await handleReopenSession(targetSessionId);
    if (data) {
      setConnectedJobId(data.connected_job_id || '');
      setConnectedJobInfo(data.connected_job_info || null);
    }
  }, [handleReopenSession]);

  const handleLoadJob = async (jobId: string) => {
    const data = await handleLoadJobSession(jobId);
    if (data) {
      setConnectedJobId(data.connected_job_id || '');
      setConnectedJobInfo(data.connected_job_info || null);
    }
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
  const { isLoading: authLoading } = useAuth();
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
    handleOpenSession(linkSessionId);
  }, [authLoading, handleOpenSession]);

  const handleDisconnectJob = async () => {
    if (!sessionId) return;
    try {
      await api.post('/analysis/disconnect-job', { session_id: sessionId });
      setConnectedJobId('');
      setConnectedJobInfo(null);
      notify('Job disconnected', 'info');
    } catch (err: any) {
      notify(errorMessage(err, 'Failed to disconnect job'), 'error');
    }
  };

  const handleFilterClick = (e: React.MouseEvent<HTMLElement>, type: 'add-genes' | 'add-protein-id' | 'remove-contaminants' | 'filter-numeric') => {
    setFilterDialogType(type);
    setFilterAnchorEl(e.currentTarget);
  };

  // Edicao que devolve a aba atualizada; 409 recarrega a aba para repetir sobre a versao atual
  // Sessao exibida agora, para descartar resposta de edicao iniciada antes do New Analysis
  const currentSessionRef = useRef(sessionId);
  currentSessionRef.current = sessionId;

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
      setFilterLoading(true);
      try {
        const { data: preview } = await api.post(url, { ...body, dry_run: true });
        setPendingRemoval({ url, body, description, preview, sessionId });
      } catch (err: any) {
        notify(errorMessage(err, 'Failed to preview filter'), 'error');
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
    setEsmAnchorEl(null);
    try {
      const res = await api.post('/analysis/run-esm1v', {
        session_id: sessionId,
        sheet_name: activeSheet,
        ...params,
      });
      setEsmTask({
        taskId: res.data.task_id,
        taskType: 'esm',
        status: 'pending',
        progress: 0,
        total: res.data.total_rows,
        sheetName: activeSheet,
        sessionId: sessionId,
      });
      notify('ESM-1v task scheduled successfully in background!', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to start ESM-1v', 'error');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.post(`/analysis/task/${taskId}/cancel`);
      setEsmTask((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      notify('Task cancelled', 'info');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to cancel task', 'error');
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
      setIdMappingTask({ taskId, ...origin, statusUrl: `/analysis/id-mapping-status/${taskId}` });
      notify('UniProt ID Mapping running in background...', 'info');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to start ID Mapping';
      notify(msg, 'error');
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
      setCompareTask({ taskId: res.data.task_id, sessionId: origin, statusUrl: `/analysis/compare-status/${res.data.task_id}` });
      notify('Comparing datasets in background...', 'info');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to start comparison', 'error');
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
      setCompareTask({ taskId: res.data.task_id, sessionId: origin, statusUrl: `/analysis/compare-status/${res.data.task_id}` });
      notify('Cross-validation started in background...', 'info');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to start cross-validation', 'error');
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
        esmRunning={esmTask !== null && (esmTask.status === 'pending' || esmTask.status === 'running')}
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

        {esmTask && (esmTask.status === 'pending' || esmTask.status === 'running') && (
          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(2, 136, 209, 0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.main' }}>
                {esmTask.status === 'pending' ? 'Preparing ESM-1v...' : 'Running ESM-1v predictions...'}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {esmTask.progress} / {esmTask.total} rows ({(esmTask.total > 0 ? (esmTask.progress / esmTask.total) * 100 : 0).toFixed(0)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={esmTask.total > 0 ? (esmTask.progress / esmTask.total) * 100 : 0}
              color="info"
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

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
        totalRows={sheetData?.total_rows || 0}
      />

      <TaskProgressWidget
        task={esmTask}
        onCancel={handleCancelTask}
        onRefreshResults={() => fetchSheetData(activeSheet, sheetData?.page || 1)}
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
    </Box>
  );
};
