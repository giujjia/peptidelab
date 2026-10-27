import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
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

  const {
    sessionId, sheetsInfo, activeSheet, sheetData, loadingSheet, uploading,
    setSheetsInfo, setSheetData, fetchSheetData, handleUpload, handleImportFiles, handleLoadExample, handleLoadCompareExample, handleLoadJobSession, handleDownload, handleBack,
    handleNumericFilter
  } = useSheetData(notify, fetchJobs);

  const {
    hiddenColumns, handleToggleColumn, handleShowAll, handleHideAll
  } = useColumnVisibility(sessionId, activeSheet, setSheetData, notify);

  const [searchQuery, setSearchQuery] = useState('');

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
  const [idMappingRunning, setIdMappingRunning] = useState(false);
  const [compareAnchorEl, setCompareAnchorEl] = useState<null | HTMLElement>(null);
  const [crossValAnchorEl, setCrossValAnchorEl] = useState<null | HTMLElement>(null);
  const [compareTaskId, setCompareTaskId] = useState<string | null>(null);

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

  // Polling para Compare & Cross-Validation
  const isComparePollingRef = useRef(false);
  useEffect(() => {
    if (!compareTaskId) return;

    let failCount = 0;
    let isCancelled = false;

    const pollCompare = async () => {
      if (isComparePollingRef.current || isCancelled) return;
      isComparePollingRef.current = true;

      try {
        const { data } = await api.get(`/analysis/compare-status/${compareTaskId}`);
        if (isCancelled) return;
        failCount = 0;
        if (data.status === 'done') {
          setCompareTaskId(null);
          notify(`Comparison complete! New tab: "${data.nova_aba}"`, 'success');
          
          if (data.nova_aba) {
            setSheetsInfo((prev: any) => ({
              ...prev,
              [data.nova_aba]: { row_count: 0, columns: [] }
            }));
            fetchSheetData(data.nova_aba, 1);
          }
        } else if (data.status === 'error') {
          setCompareTaskId(null);
          notify(`Compare Error: ${data.error}`, 'error');
        }
      } catch {
        if (isCancelled) return;
        failCount++;
        if (failCount >= 5) {
          setCompareTaskId(null);
          notify('Comparison polling stopped due to network errors', 'error');
        }
      } finally {
        isComparePollingRef.current = false;
      }
    };

    const interval = setInterval(pollCompare, 2000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
      isComparePollingRef.current = false;
    };
  }, [compareTaskId, setSheetsInfo, notify, fetchSheetData]);

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

  const handleDisconnectJob = async () => {
    if (!sessionId) return;
    try {
      await api.post('/analysis/disconnect-job', { session_id: sessionId, target_column: '' });
      setConnectedJobId('');
      setConnectedJobInfo(null);
      notify('Job disconnected', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterClick = (e: React.MouseEvent<HTMLElement>, type: 'add-genes' | 'add-protein-id' | 'remove-contaminants' | 'filter-numeric') => {
    setFilterDialogType(type);
    setFilterAnchorEl(e.currentTarget);
  };

  const handleFilterConfirm = async (params: Record<string, string>) => {
    setFilterAnchorEl(null);
    if (!sessionId) return;

    if (filterDialogType === 'filter-numeric') {
      const thresholdNum = parseFloat(params.threshold);
      handleNumericFilter(params.target_column, params.operator, isNaN(thresholdNum) ? 0.01 : thresholdNum);
      return;
    }

    setFilterLoading(true);
    try {
      let res;
      if (filterDialogType === 'add-genes') {
        res = await api.post('/analysis/add-genes', {
          session_id: sessionId,
          sheet_name: activeSheet,
          target_column: params.target_column,
        });
      } else if (filterDialogType === 'add-protein-id') {
        const targetCol = params.target_sequence_column || params.target_column;
        res = await api.post('/analysis/add-protein-id', {
          session_id: sessionId,
          target_sheet: activeSheet,
          sheet_name: activeSheet,
          target_sequence_column: targetCol,
          target_column: targetCol,
        });
      } else if (filterDialogType === 'remove-contaminants') {
        res = await api.post('/analysis/remove-contaminants', {
          session_id: sessionId,
          sheet_name: activeSheet,
          target_column: params.target_column,
          keyword: params.keyword || 'contaminant',
        });
      }
      if (res?.data?.data) {
        setSheetData(res.data.data);
        notify(res.data.message, 'success');
      }
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to apply filter', 'error');
    } finally {
      setFilterLoading(false);
    }
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
    setIdMappingRunning(true);
    try {
      const res = await api.post('/analysis/run-id-mapping', {
        session_id: sessionId,
        sheet_name: activeSheet,
        col_origin,
      });
      const taskId = res.data.task_id;
      notify('UniProt ID Mapping running in background...', 'info');

      let failCount = 0;
      const poll = setInterval(async () => {
        try {
          const { data: status } = await api.get(`/analysis/id-mapping-status/${taskId}`);
          failCount = 0;
          if (status.status === 'done') {
            clearInterval(poll);
            setIdMappingRunning(false);
            notify('UniProt ID Mapping complete!', 'success');
            fetchSheetData(activeSheet, sheetData?.page || 1);
          } else if (status.status === 'error') {
            clearInterval(poll);
            setIdMappingRunning(false);
            const errDetail = typeof status.error === 'string' ? status.error : 'ID Mapping processing error';
            notify(`ID Mapping Error: ${errDetail}`, 'error');
          }
        } catch {
          failCount++;
          if (failCount >= 5) {
            clearInterval(poll);
            setIdMappingRunning(false);
            notify('ID Mapping polling stopped due to network errors', 'error');
          }
        }
      }, 2000);
    } catch (err: any) {
      setIdMappingRunning(false);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to start ID Mapping';
      notify(msg, 'error');
    }
  };

  const handleCompareConfirm = async (params: { sheet_a: string; sheet_b: string; col_key: string }) => {
    setCompareAnchorEl(null);
    try {
      const res = await api.post('/analysis/run-compare', {
        session_id: sessionId,
        ...params,
      });
      setCompareTaskId(res.data.task_id);
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
  }) => {
    setCrossValAnchorEl(null);
    try {
      const res = await api.post('/analysis/run-crossval', {
        session_id: sessionId,
        ...params,
      });
      setCompareTaskId(res.data.task_id);
      notify('Cross-validation started in background...', 'info');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to start cross-validation', 'error');
    }
  };

  const handleNewAnalysis = async () => {
    await handleBack();
    setSearchQuery('');
    setConnectedJobId('');
    setConnectedJobInfo(null);
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
          onLoadJobAsSession={handleLoadJobSession}
          onConnectJobToSession={handleConnectJob}
          currentSessionId={sessionId}
          connectedJobId={connectedJobId}
          onRefreshActiveSheet={() => fetchSheetData(activeSheet, sheetData?.page || 1)}
        />
      </>
    );
  }

  const filteredData = sheetData?.data.filter((row: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const activeCols = sheetData.columns || [];
    return activeCols.some((col: any) => String(row[col] ?? '').toLowerCase().includes(q));
  }) ?? [];

  const allColumns = sheetData?.all_columns ?? [];
  const currentHiddenColumns = hiddenColumns[activeSheet] || [];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <Sidebar 
        filteredDataLength={filteredData.length}
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

      <JobsDrawer
        open={jobsDrawerOpen}
        onClose={() => setJobsDrawerOpen(false)}
        onLoadJobAsSession={handleLoadJobSession}
        onConnectJobToSession={handleConnectJob}
        currentSessionId={sessionId}
        connectedJobId={connectedJobId}
        onRefreshActiveSheet={() => fetchSheetData(activeSheet, sheetData?.page || 1)}
      />
    </Box>
  );
};
