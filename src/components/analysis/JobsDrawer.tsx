import React, { useState, useEffect, useCallback } from 'react';
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
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export interface ProcessorJob {
  id: string;
  mutation_type: string;
  created_at: string;
  has_dbpepmutref: boolean;
}

export interface AsyncTaskItem {
  id: string;
  task_type: string;
  session_id: string;
  status: string;
  progress: number;
  total: number;
  error?: string | null;
  created_at?: string | null;
  finished_at?: string | null;
}

interface JobsDrawerProps {
  open: boolean;
  onClose: () => void;
  onLoadJobAsSession: (jobId: string) => Promise<void>;
  onConnectJobToSession?: (jobId: string) => Promise<void>;
  currentSessionId?: string;
  connectedJobId?: string;
  onRefreshActiveSheet?: () => void;
}

export const JobsDrawer: React.FC<JobsDrawerProps> = ({
  open,
  onClose,
  onLoadJobAsSession,
  onConnectJobToSession,
  currentSessionId,
  connectedJobId,
  onRefreshActiveSheet,
}) => {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [jobs, setJobs] = useState<ProcessorJob[]>([]);
  const [tasks, setTasks] = useState<AsyncTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [jobsRes, tasksRes] = await Promise.all([
        api.get('/analysis/jobs').catch(() => ({ data: [] })),
        api.get('/analysis/tasks').catch(() => ({ data: [] })),
      ]);
      setJobs(jobsRes.data || []);
      setTasks(tasksRes.data || []);
    } catch {
      // Ignora erro silenciosamente
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const handleLoadJob = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      await onLoadJobAsSession(jobId);
      onClose();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConnectJob = async (jobId: string) => {
    if (!onConnectJobToSession) return;
    setActionLoadingId(jobId);
    try {
      await onConnectJobToSession(jobId);
      onClose();
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'esm':
        return 'ESM-1v Scoring';
      case 'id_mapping':
        return 'UniProt ID Mapping';
      case 'compare':
        return 'Dataset Intersection';
      case 'crossval':
        return 'Cross-Validation';
      default:
        return type.toUpperCase();
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
            label="Completed"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600, height: 22 }}
          />
        );
      case 'running':
        return (
          <Chip
            size="small"
            icon={<HourglassEmptyIcon sx={{ fontSize: '14px !important' }} />}
            label="Running"
            color="info"
            variant="outlined"
            sx={{ fontWeight: 600, height: 22 }}
          />
        );
      case 'pending':
        return (
          <Chip
            size="small"
            label="Pending"
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 600, height: 22 }}
          />
        );
      case 'error':
        return (
          <Chip
            size="small"
            icon={<ErrorIcon sx={{ fontSize: '14px !important' }} />}
            label="Error"
            color="error"
            variant="outlined"
            sx={{ fontWeight: 600, height: 22 }}
          />
        );
      case 'cancelled':
        return (
          <Chip
            size="small"
            label="Cancelled"
            variant="outlined"
            sx={{ fontWeight: 600, height: 22 }}
          />
        );
      default:
        return <Chip size="small" label={status} variant="outlined" sx={{ height: 22 }} />;
    }
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
                const isActing = actionLoadingId === j.id;
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

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      Job ID: {j.id.slice(0, 8)}...
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={isActing ? <CircularProgress size={14} color="inherit" /> : <LaunchIcon sx={{ fontSize: 15 }} />}
                        onClick={() => handleLoadJob(j.id)}
                        disabled={isActing}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', flex: 1 }}
                      >
                        Open in Workspace
                      </Button>
                      {currentSessionId && onConnectJobToSession && !isConnected && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleConnectJob(j.id)}
                          disabled={isActing}
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(t.created_at)}
                    </Typography>

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
                </Paper>
              ))}
            </List>
          )
        )}
      </Box>
    </Drawer>
  );
};
