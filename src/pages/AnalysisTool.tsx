import React, { useState, useCallback, useEffect } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { FilterPopover } from '../components/analysis/FilterPopover';
import { EsmPopover } from '../components/analysis/EsmPopover';
import { IdMappingPopover } from '../components/analysis/IdMappingPopover';
import { ComparePopover } from '../components/analysis/ComparePopover';
import { CrossValPopover } from '../components/analysis/CrossValPopover';
import { AvailableJob } from '../types';

import { useSheetData } from '../hooks/useSheetData';
import { useColumnVisibility } from '../hooks/useColumnVisibility';

import { UploadScreen } from '../components/analysis/UploadScreen';
import { Sidebar } from '../components/analysis/Sidebar';
import { HeaderBar } from '../components/analysis/HeaderBar';
import { SheetTabs } from '../components/analysis/SheetTabs';
import { DataTable } from '../components/analysis/DataTable';
import { PaginationControl } from '../components/analysis/PaginationControl';

const FILTER_CONFIG = {
  'add-genes': { title: 'Add Gene Information', description: 'Automatically fetches and maps gene symbols from the NCBI Entrez database based on your protein identifiers (e.g. GI or Locus).' },
  'add-protein-id': { title: 'Add Protein ID', description: 'Matches sequences from this active sheet to your connected Job\'s database to automatically retrieve their Protein IDs.' },
  'remove-contaminants': { title: 'Remove Contaminants', description: 'Scans the selected column and permanently deletes rows containing a specified keyword.' },
  'filter-numeric': { title: 'Filter Numeric', description: 'Filters the selected numerical column based on an operator and threshold.' },
};

export const AnalysisTool: React.FC = () => {
  const { notify } = useNotification();
  
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
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
    setSheetsInfo, setSheetData, fetchSheetData, handleUpload, handleLoadExample, handleDownload, handleBack
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
  const [esmTask, setEsmTask] = useState<{
    taskId: string;
    status: string;
    progress: number;
    total: number;
  } | null>(null);

  // ID Mapping State
  const [idMappingAnchorEl, setIdMappingAnchorEl] = useState<null | HTMLElement>(null);
  const [idMappingRunning, setIdMappingRunning] = useState(false);

  // Compare Datasets / Cross-Validation State
  const [compareAnchorEl, setCompareAnchorEl] = useState<null | HTMLElement>(null);
  const [crossValAnchorEl, setCrossValAnchorEl] = useState<null | HTMLElement>(null);
  const [compareTaskId, setCompareTaskId] = useState<string | null>(null);

  // ESM-1v Polling
  useEffect(() => {
    if (!esmTask || esmTask.status === 'done' || esmTask.status === 'error') return;
    let failCount = 0;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/analysis/esm-status/${esmTask.taskId}`);
        const data = res.data;
        failCount = 0;
        setEsmTask(prev => {
          if (!prev) return null;
          return { ...prev, status: data.status, progress: data.progress, total: data.total };
        });
        if (data.status === 'done') {
          clearInterval(interval);
          notify('ESM-1v predictions completed!', 'success');
          fetchSheetData(activeSheet, sheetData?.page || 1);
        } else if (data.status === 'error') {
          clearInterval(interval);
          notify(`ESM-1v Error: ${data.error}`, 'error');
        }
      } catch (err) {
        failCount++;
        if (failCount >= 5) {
          clearInterval(interval);
          setEsmTask(null);
          notify('ESM-1v polling stopped due to network errors', 'error');
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [esmTask, activeSheet, fetchSheetData, notify, sheetData?.page]);


  // Compare Polling
  useEffect(() => {
    if (!compareTaskId) return;
    let failCount = 0;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/analysis/compare-status/${compareTaskId}`);
        const data = res.data;
        failCount = 0;
        if (data.status === 'done') {
          clearInterval(interval);
          setCompareTaskId(null);
          notify(`Intersection complete! New tab: "${data.nova_aba}"`, 'success');
          // Atualiza sheetsInfo para incluir nova aba
          const infoRes = await api.get(`/analysis/sheet/${sessionId}/${data.nova_aba}`);
          if (infoRes.data) {
            setSheetsInfo(prev => ({
              ...prev,
              [data.nova_aba]: {
                columns: infoRes.data.all_columns || [],
                row_count: infoRes.data.total_rows || 0,
              }
            }));
            // Troca automaticamente para a nova aba criada
            fetchSheetData(data.nova_aba, 1);
          }
        } else if (data.status === 'error') {
          clearInterval(interval);
          setCompareTaskId(null);
          notify(`Compare Error: ${data.error}`, 'error');
        }
      } catch (err) {
        failCount++;
        if (failCount >= 5) {
          clearInterval(interval);
          setCompareTaskId(null);
          notify('Comparison polling stopped due to network errors', 'error');
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [compareTaskId, sessionId, setSheetsInfo, notify, fetchSheetData]);

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
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to connect job');
    } finally {
      setConnectingJob(false);
    }
  };

  const handleDisconnectJob = async () => {
    try {
      await api.post('/analysis/disconnect-job', {
        session_id: sessionId,
        mapping: {},
      });
    } catch (err) {
      console.error(err);
    }
    setConnectedJobId('');
    setConnectedJobInfo(null);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, type: 'add-genes' | 'add-protein-id' | 'remove-contaminants' | 'filter-numeric') => {
    setFilterDialogType(type);
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterConfirm = async (params: Record<string, string>) => {
    setFilterAnchorEl(null);
    setFilterLoading(true);
    try {
      const endpoint = `/analysis/${filterDialogType}`;
      const payload: any = {
        session_id: sessionId,
        ...params
      };
      
      if (filterDialogType === 'add-protein-id') {
        payload.target_sheet = activeSheet;
      } else {
        payload.sheet_name = activeSheet;
      }
      
      const res = await api.post(endpoint, payload);
      
      notify(res.data.message || 'Filter applied successfully', 'success');
      
      if (filterDialogType === 'add-protein-id' || payload.sheet_name === activeSheet) {
        setSheetData(res.data.data);
      }
      
      if (res.data.data && res.data.data.all_columns) {
        setSheetsInfo(prev => ({
          ...prev,
          [activeSheet]: {
            ...prev[activeSheet],
            columns: res.data.data.all_columns,
            row_count: res.data.data.total_rows
          }
        }));
      }

    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to apply filter';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        errorMsg = detail[0].msg;
      }
      notify(errorMsg, 'error');
    } finally {
      setFilterLoading(false);
    }
  };

  const handleEsmClick = (event: React.MouseEvent<HTMLElement>) => {
    setEsmAnchorEl(event.currentTarget);
  };

  const handleEsmConfirm = async (params: {
    col_sequence: string;
    col_position: string;
    col_old_aa: string;
    col_new_aa: string;
  }) => {
    setEsmAnchorEl(null);
    try {
      const res = await api.post('/analysis/run-esm1v', {
        session_id: sessionId,
        sheet_name: activeSheet,
        ...params
      });
      setEsmTask({
        taskId: res.data.task_id,
        status: 'pending',
        progress: 0,
        total: res.data.total_rows
      });
      notify('ESM-1v predictions task started in background', 'info');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to start ESM-1v task', 'error');
    }
  };

  const handleIdMappingConfirm = async (params: { col_origin: string }) => {
    setIdMappingAnchorEl(null);
    setIdMappingRunning(true);
    try {
      const taskRes = await api.post('/analysis/run-id-mapping', {
        session_id: sessionId,
        sheet_name: activeSheet,
        col_origin: params.col_origin,
      });
      const taskId = taskRes.data.task_id;
      let failCount = 0;
      const poll = setInterval(async () => {
        try {
          const statusRes = await api.get(`/analysis/id-mapping-status/${taskId}`);
          const status = statusRes.data;
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
      // Usa a mesma rotina de polling que compare
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
      <UploadScreen 
        uploading={uploading} 
        onUpload={handleUpload} 
        onLoadExample={handleLoadExample} 
      />
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
      />

      <IdMappingPopover
        anchorEl={idMappingAnchorEl}
        onClose={() => setIdMappingAnchorEl(null)}
        onConfirm={handleIdMappingConfirm}
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
    </Box>
  );
};
