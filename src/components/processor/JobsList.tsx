import React from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Chip, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { Job } from '../../types';

interface JobsListProps {
  jobs: Job[];
  isAuthenticated: boolean;
  currentMutationLabel: string;
  onViewJob: (jobId: string) => void;
  onDownloadZip: (jobId: string) => void;
  onDeleteJob?: (jobId: string) => void;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const JobsList: React.FC<JobsListProps> = ({ jobs, isAuthenticated, currentMutationLabel, onViewJob, onDownloadZip, onDeleteJob }) => {
  const navigate = useNavigate();

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
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Recent Analysis Jobs</Typography>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {!isAuthenticated ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 6, textAlign: "center", height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Authentication Required</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please sign in to view your recent jobs and processing history.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/login')} sx={{ px: 3 }}>
              Sign In
            </Button>
          </Box>
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
                              onClick={() => onDownloadZip(job.id)}
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
                            onClick={() => onDeleteJob(job.id)}
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

      {isAuthenticated && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
            Storage limit: 200 MB per user. Results files are automatically stored for up to 60 days.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
