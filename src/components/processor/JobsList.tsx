import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { Job, AsyncTaskItem } from '../../types';
import { getTaskTypeLabel, getTaskStatusMeta } from '../../utils/tasks';

interface JobsListProps {
  jobs: Job[];
  analysisTasks?: AsyncTaskItem[];
  isAuthenticated?: boolean;
  currentMutationLabel: string;
  onViewJob: (jobId: string) => void;
  onDownloadZip: (jobId: string) => Promise<void> | void;
  onDeleteJob?: (jobId: string) => void;
  onOpenTaskSession?: (sessionId: string) => void;
  onDownloadTaskSession?: (sessionId: string) => Promise<void>;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const JobsList: React.FC<JobsListProps> = ({
  jobs,
  analysisTasks = [],
  currentMutationLabel,
  onViewJob,
  onDownloadZip,
  onDeleteJob,
  onOpenTaskSession,
  onDownloadTaskSession,
}) => {
  const navigate = useNavigate();
  // Exclusao apaga os arquivos de resultado e nao tem volta; pede confirmacao antes
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(() => new Set());

  const setDownloading = (key: string, busy: boolean) => {
    setDownloadingKeys((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const getStatusColor = (status: string): "success" | "error" | "info" | "warning" => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      case 'PROCESSING': return 'info';
      default: return 'warning';
    }
  };

  return (
    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 1.5 }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Recent Analysis Jobs</Typography>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ minHeight: 36, mt: 0.5 }}
        >
          <Tab label={`Processor (${jobs.length})`} sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }} />
          <Tab label={`Analysis Tasks (${analysisTasks.length})`} sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }} />
        </Tabs>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {tabIndex === 1 ? (
          analysisTasks.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 6, textAlign: "center", height: '100%' }}>
              <Box sx={{ width: 64, height: 64, bgcolor: 'primary.light', borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                <RefreshIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>No analysis tasks yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                ESM-1v scoring, ID mapping, and comparison tasks from Analysis Tool will appear here.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {analysisTasks.map((task) => {
                    const chip = getTaskStatusMeta(task.status);
                    return (
                      <TableRow key={task.id} hover>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip
                              label={getTaskTypeLabel(task.task_type)}
                              size="small"
                              sx={{ height: 20, fontSize: '10px', fontWeight: 600, bgcolor: 'primary.light', color: 'primary.main', borderRadius: 1 }}
                            />
                            {(task.status === 'running' || task.status === 'pending') && task.total > 0 && (
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {task.progress}/{task.total}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {task.created_at ? new Date(task.created_at).toLocaleString() : 'Unknown date'}
                          </Typography>
                          {task.error && (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                              {task.error}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Chip
                              label={chip.label.toUpperCase()}
                              size="small"
                              color={chip.color}
                              sx={{ height: 24, fontSize: '11px', fontWeight: 600 }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onOpenTaskSession ? onOpenTaskSession(task.session_id) : navigate(`/analysis?session_id=${encodeURIComponent(task.session_id)}`)}
                            >
                              Open
                            </Button>
                            {task.status === 'done' && onDownloadTaskSession && (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={downloadingKeys.has(`task:${task.id}`)}
                                onClick={async () => {
                                  const key = `task:${task.id}`;
                                  setDownloading(key, true);
                                  try {
                                    await onDownloadTaskSession(task.session_id);
                                  } finally {
                                    setDownloading(key, false);
                                  }
                                }}
                              >
                                XLSX
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : jobs.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 6, textAlign: "center", height: '100%' }}>
            <Box sx={{ width: 64, height: 64, bgcolor: 'primary.light', borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
              <RefreshIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>No results yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
              Submit your {currentMutationLabel.toLowerCase()} mutation data to track its progress here.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip 
                          label={job.mutation_type} 
                          size="small" 
                          sx={{ height: 20, fontSize: '10px', fontWeight: 600, bgcolor: 'primary.light', color: 'primary.main', borderRadius: 1 }} 
                        />
                        <Typography variant="caption" color="text.primary" fontWeight={500}>
                          {job.input_mode === 'file' ? 'File Upload' : 'Text Input'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(job.created_at).toLocaleString()} • {formatSize(job.size_bytes)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Chip 
                          label={job.status} 
                          size="small" 
                          color={getStatusColor(job.status)}
                          sx={{ height: 24, fontSize: '11px', fontWeight: 600 }}
                        />
                        {job.status === 'COMPLETED' && (
                          <>
                            <Button 
                              size="small" 
                              variant="contained" 
                              onClick={() => onViewJob(job.id)}
                            >
                              View
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              disabled={downloadingKeys.has(`zip:${job.id}`)}
                              onClick={async () => {
                                const key = `zip:${job.id}`;
                                setDownloading(key, true);
                                try {
                                  await onDownloadZip(job.id);
                                } finally {
                                  setDownloading(key, false);
                                }
                              }}
                            >
                              ZIP
                            </Button>
                          </>
                        )}
                        {onDeleteJob && (
                          <IconButton 
                            size="small" 
                            color="error" 
                            title="Delete Job" 
                            onClick={() => setJobToDelete(job.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={!!jobToDelete} onClose={() => setJobToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this job?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            The job and its result files are removed from the server now. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setJobToDelete(null)} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
            onClick={() => {
              if (jobToDelete && onDeleteJob) onDeleteJob(jobToDelete);
              setJobToDelete(null);
            }}
          >
            Delete Job
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
          {tabIndex === 0
            ? 'Storage limit: 200 MB per user. Results files are automatically stored for up to 60 days.'
            : 'Analysis sessions with results are kept for 24 hours after the task finishes.'}
        </Typography>
      </Box>
    </Paper>
  );
};
