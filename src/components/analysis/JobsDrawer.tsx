import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Button,
  Chip,
  LinearProgress,
  List,
  Paper,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LaunchIcon from '@mui/icons-material/Launch';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '../../services/api';
import { errorMessage } from '../../services/errors';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { downloadSessionWorkbook } from '../../utils/download';
import { getTaskTypeLabel, getTaskStatusMeta } from '../../utils/tasks';
import { AsyncTaskItem, AvailableJob } from '../../types';

interface JobsDrawerProps {
  open: boolean;
  onClose: () => void;
  onLoadJobAsSession: (jobId: string) => Promise<boolean | void>;
  onConnectJobToSession?: (jobId: string) => Promise<boolean | void>;
  currentSessionId?: string;
  connectedJobId?: string;
  onRefreshActiveSheet?: () => void;
  onOpenSession?: (sessionId: string) => Promise<boolean | void>;
}

export const JobsDrawer: React.FC<JobsDrawerProps> = ({
  open,
  onClose,
  onLoadJobAsSession,
  onConnectJobToSession,
  currentSessionId,
  connectedJobId,
  onRefreshActiveSheet,
  onOpenSession,
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [tasks, setTasks] = useState<AsyncTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(() => new Set());
  const fetchGenRef = useRef(0);

  const setActionBusy = (key: string, busy: boolean) => {
    setLoadingActions((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    if (!user) {
      fetchGenRef.current += 1;
      setJobs([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    const gen = ++fetchGenRef.current;
    setLoading(true);
    try {
      const [jobsRes, tasksRes] = await Promise.all([
        api.get('/analysis/jobs'),
        api.get('/analysis/tasks'),
      ]);
      if (gen !== fetchGenRef.current) return;
      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (err: any) {
      if (gen === fetchGenRef.current) {
        notify(errorMessage(err, 'Failed to load history'), 'error');
      }
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, [user, notify]);

  useEffect(() => {
    if (!user) {
      fetchGenRef.current += 1;
      setJobs([]);
      setTasks([]);
      return;
    }
    if (open) {
      fetchData();
    }
  }, [open, user, fetchData]);

  const handleLoadJob = async (jobId: string) => {
    setActionBusy(jobId, true);
    try {
      const ok = await onLoadJobAsSession(jobId);
      if (ok !== false) onClose();
    } finally {
      setActionBusy(jobId, false);
    }
  };

  const handleConnectJob = async (jobId: string) => {
    if (!onConnectJobToSession) return;
    setActionBusy(jobId, true);
    try {
      const ok = await onConnectJobToSession(jobId);
      if (ok !== false) onClose();
    } finally {
      setActionBusy(jobId, false);
    }
  };

  const getStatusChip = (status: string) => {
    const meta = getTaskStatusMeta(status);
    const icon = status === 'done'
      ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
      : status === 'error'
        ? <ErrorIcon sx={{ fontSize: '14px !important' }} />
        : status === 'running'
          ? <HourglassEmptyIcon sx={{ fontSize: '14px !important' }} />
          : undefined;
    return (
      <Chip
        size="small"
        icon={icon}
        label={meta.label}
        color={meta.color}
        variant="outlined"
        sx={{ fontWeight: 600, height: 22 }}
      />
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            My Jobs & Analyses
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchData} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 44,
          '& .MuiTab-root': { minHeight: 44, py: 1, textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab
          icon={<FolderIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`Processor Jobs (${jobs.length})`}
        />
        <Tab
          icon={<HistoryIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={`Background Tasks (${tasks.length})`}
        />
      </Tabs>

      {loading && <LinearProgress sx={{ height: 2 }} />}

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {!user ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Please sign in to view and connect your saved processor jobs and analysis history.
            </Typography>
          </Box>
        ) : tabIndex === 0 ? (
          /* Aba 1: Processor Jobs */
          jobs.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No completed processor jobs found. Run an analysis in Peptide Processor to see results here.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {jobs.map((j) => {
                const isConnected = connectedJobId === j.id;
                const isActing = loadingActions.has(j.id);
                return (
                  <Paper
                    key={j.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 1.5,
                      borderRadius: 2,
                      borderColor: isConnected ? 'primary.main' : 'divider',
                      bgcolor: isConnected ? 'rgba(82, 72, 162, 0.04)' : 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Chip
                          label={j.mutation_type.toUpperCase()}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                        />
                        {isConnected && (
                          <Chip
                            label="Active in Session"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ ml: 1, fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(j.created_at)}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: j.has_dbpepmutref ? 2 : 0.5 }}>
                      Job ID: {j.id.slice(0, 8)}...
                    </Typography>
                    {/* Frameshift nao gera tabela de relacao; abrir ou conectar sempre falharia */}
                    {!j.has_dbpepmutref && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        This mutation type has no peptide relation table to open in the workspace. Download its results in Peptide Processor.
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={isActing ? <CircularProgress size={14} color="inherit" /> : <LaunchIcon sx={{ fontSize: 15 }} />}
                        onClick={() => handleLoadJob(j.id)}
                        disabled={isActing || !j.has_dbpepmutref}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', flex: 1 }}
                      >
                        Open in Workspace
                      </Button>
                      {currentSessionId && onConnectJobToSession && !isConnected && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleConnectJob(j.id)}
                          disabled={isActing || !j.has_dbpepmutref}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                          Connect
                        </Button>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </List>
          )
        ) : (
          /* Aba 2: Background Tasks */
          tasks.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No recent background tasks. ESM-1v calculations and ID mappings will appear here.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {tasks.map((t) => (
                <Paper
                  key={t.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {getTaskTypeLabel(t.task_type)}
                    </Typography>
                    {getStatusChip(t.status)}
                  </Box>

                  {/* Progress Bar for Running/Pending */}
                  {(t.status === 'running' || t.status === 'pending') && (
                    <Box sx={{ my: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {t.progress} / {t.total} ({t.total > 0 ? ((t.progress / t.total) * 100).toFixed(0) : 0}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={t.total > 0 ? (t.progress / t.total) * 100 : 0}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}

                  {t.error && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, bgcolor: 'rgba(211, 47, 47, 0.05)', p: 1, borderRadius: 1 }}>
                      {t.error}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(t.created_at)}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {t.status === 'done' && (
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          startIcon={<DownloadIcon sx={{ fontSize: '15px !important' }} />}
                          disabled={loadingActions.has(`${t.id}:download`)}
                          onClick={async () => {
                            const key = `${t.id}:download`;
                            setActionBusy(key, true);
                            try {
                              await downloadSessionWorkbook(t.session_id);
                            } catch (err: any) {
                              notify(errorMessage(err, 'Session expired or file unavailable'), 'error');
                            } finally {
                              setActionBusy(key, false);
                            }
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', p: 0 }}
                        >
                          Download (.xlsx)
                        </Button>
                      )}
                      {onOpenSession && currentSessionId !== t.session_id && (
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          disabled={loadingActions.has(t.id)}
                          onClick={async () => {
                            setActionBusy(t.id, true);
                            try {
                              const ok = await onOpenSession(t.session_id);
                              if (ok !== false) onClose();
                            } finally {
                              setActionBusy(t.id, false);
                            }
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', p: 0 }}
                        >
                          Open Session
                        </Button>
                      )}
                      {t.status === 'done' && onRefreshActiveSheet && currentSessionId === t.session_id && (
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          onClick={onRefreshActiveSheet}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', p: 0 }}
                        >
                          Reload Active Sheet
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          )
        )}
      </Box>
    </Drawer>
  );
};
