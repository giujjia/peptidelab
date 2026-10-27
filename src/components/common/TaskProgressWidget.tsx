import React, { useState } from 'react';
import {
  Paper, Box, Typography, LinearProgress, Button, IconButton,
  Collapse, Chip, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';

export interface TaskInfo {
  taskId: string;
  taskType?: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'cancelled';
  progress: number;
  total: number;
  error?: string | null;
  sheetName?: string;
  sessionId?: string;
}

interface TaskProgressWidgetProps {
  task: TaskInfo | null;
  onCancel: (taskId: string) => Promise<void>;
  onRefreshResults?: () => void;
  onDismiss: () => void;
}

export const TaskProgressWidget: React.FC<TaskProgressWidgetProps> = ({
  task,
  onCancel,
  onRefreshResults,
  onDismiss,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!task) return null;

  const isRunning = task.status === 'pending' || task.status === 'running';
  const isDone = task.status === 'done';
  const isError = task.status === 'error';
  const isCancelled = task.status === 'cancelled';

  const percent = task.total > 0 ? Math.min(100, Math.round((task.progress / task.total) * 100)) : 0;

  const handleCancelClick = async () => {
    setCancelling(true);
    try {
      await onCancel(task.taskId);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: minimized ? 260 : 340,
        zIndex: 1300,
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isDone ? 'success.light' : isError ? 'error.light' : isCancelled ? 'warning.light' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.25s ease-in-out',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: isDone
            ? 'rgba(46, 125, 50, 0.08)'
            : isError
            ? 'rgba(211, 47, 47, 0.08)'
            : isCancelled
            ? 'rgba(237, 108, 2, 0.08)'
            : 'rgba(82, 72, 162, 0.06)',
          borderBottom: minimized ? 0 : '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isRunning && <ScienceIcon color="primary" sx={{ fontSize: 20, animation: 'pulse 1.5s infinite' }} />}
          {isDone && <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />}
          {isError && <ErrorIcon color="error" sx={{ fontSize: 20 }} />}
          {isCancelled && <CancelIcon color="warning" sx={{ fontSize: 20 }} />}
          
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
            {task.taskType === 'esm' || !task.taskType ? 'ESM-1v AI Predictor' : 'Background Task'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => setMinimized(!minimized)}>
            {minimized ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
          {!isRunning && (
            <IconButton size="small" onClick={onDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Body */}
      <Collapse in={!minimized}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Status Label and Row Count */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip
              size="small"
              label={
                task.status === 'pending'
                  ? 'Preparing...'
                  : task.status === 'running'
                  ? 'Calculating...'
                  : task.status === 'done'
                  ? 'Completed'
                  : task.status === 'cancelled'
                  ? 'Cancelled'
                  : 'Error'
              }
              color={
                isDone
                  ? 'success'
                  : isError
                  ? 'error'
                  : isCancelled
                  ? 'warning'
                  : 'primary'
              }
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {task.progress} / {task.total} ({percent}%)
            </Typography>
          </Box>

          {/* Progress Bar */}
          {isRunning && (
            <LinearProgress
              variant={task.status === 'pending' ? 'indeterminate' : 'determinate'}
              value={percent}
              sx={{ height: 6, borderRadius: 3 }}
            />
          )}

          {/* Error Details */}
          {isError && task.error && (
            <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.75rem', lineHeight: 1.3 }}>
              {task.error}
            </Typography>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            {isRunning && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                fullWidth
                disabled={cancelling}
                onClick={handleCancelClick}
                startIcon={cancelling ? <CircularProgress size={14} color="inherit" /> : null}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Task'}
              </Button>
            )}

            {isDone && onRefreshResults && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                fullWidth
                onClick={() => {
                  onRefreshResults();
                  onDismiss();
                }}
              >
                Load Results
              </Button>
            )}

            {(isError || isCancelled) && (
              <Button variant="outlined" size="small" fullWidth onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};
