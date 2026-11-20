import React from 'react';
import { Box, Typography, Button, Divider, Tooltip, Chip, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ScienceIcon from '@mui/icons-material/Science';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { AvailableJob, SheetData } from '../../types';

interface SidebarProps {
  filteredDataLength: number;
  totalRows?: number;
  sheetData: SheetData | null;
  connectedJobId: string;
  connectedJobInfo: { mutation_type: string; dbpepmutref_rows: number } | null;
  availableJobs: AvailableJob[];
  connectingJob: boolean;
  filterLoading: boolean;
  filterDialogType: string;
  esmRunning: boolean;
  idMappingRunning: boolean;
  onConnectJob: (jobId: string) => void;
  onDisconnectJob: () => void;
  onFilterClick: (event: React.MouseEvent<HTMLElement>, type: 'add-genes' | 'add-protein-id' | 'remove-contaminants') => void;
  onFilterNumericClick: (event: React.MouseEvent<HTMLElement>) => void;
  onEsmClick: (event: React.MouseEvent<HTMLElement>) => void;
  esmAvailable?: boolean;
  onIdMappingClick: (event: React.MouseEvent<HTMLElement>) => void;
  onCompareClick: (event: React.MouseEvent<HTMLElement>) => void;
  onCrossValClick: (event: React.MouseEvent<HTMLElement>) => void;
  onResetFilters: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  filteredDataLength, totalRows, sheetData, connectedJobId, connectedJobInfo, availableJobs, connectingJob,
  filterLoading, filterDialogType, esmRunning, idMappingRunning,
  onConnectJob, onDisconnectJob, onFilterClick, onFilterNumericClick, onEsmClick, onIdMappingClick, onCompareClick, onCrossValClick, onResetFilters,
  esmAvailable = true
}) => {
  // So Jobs com tabela de relacao podem ser conectados (frameshift nao gera)
  const connectableJobs = availableJobs.filter(j => j.has_dbpepmutref);
  return (
    <Box sx={{
      width: 220, flexShrink: 0, bgcolor: 'white', borderRight: 1, borderColor: 'divider',
      p: 2, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
        Filters & Columns
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
        {filteredDataLength} of {totalRows ?? sheetData?.total_rows ?? 0} rows
      </Typography>

      {/* Job Connection */}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', mb: 0.5 }}>
        Job Connection
      </Typography>
      {connectedJobId ? (
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<LinkIcon />}
            label={`${connectedJobInfo?.mutation_type} (${connectedJobInfo?.dbpepmutref_rows} mutations)`}
            size="small"
            color="primary"
            sx={{ width: '100%', justifyContent: 'flex-start', mb: 0.5 }}
          />
          <Button
            variant="text"
            size="small"
            startIcon={<LinkOffIcon />}
            onClick={onDisconnectJob}
            sx={{ textTransform: 'none', fontSize: '11px', p: 0, minWidth: 0, color: 'text.secondary' }}
          >
            Disconnect
          </Button>
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" fullWidth>
            <Select
              value=""
              displayEmpty
              onChange={(e) => onConnectJob(e.target.value as string)}
              disabled={connectingJob || connectableJobs.length === 0}
              sx={{ fontSize: '12px' }}
            >
              <MenuItem value="" disabled>
                <em>{connectableJobs.length === 0 ? 'No jobs available' : 'Select a job...'}</em>
              </MenuItem>
              {connectableJobs.map(job => (
                <MenuItem key={job.id} value={job.id} sx={{ fontSize: '12px' }}>
                  {job.mutation_type} — {new Date(job.created_at).toLocaleDateString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {connectingJob && <CircularProgress size={14} sx={{ mt: 0.5, display: 'block', mx: 'auto' }} />}
        </Box>
      )}

      <Divider sx={{ mb: 1.5 }} />

      {/* Filters */}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>
        Filters
      </Typography>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={filterLoading && filterDialogType === 'add-genes' ? <CircularProgress size={16} /> : <ScienceIcon sx={{ fontSize: 16 }} />}
        onClick={(e) => onFilterClick(e, 'add-genes')}
        disabled={filterLoading || !sheetData}
        sx={{ 
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5,
          color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
        }}
      >
        {filterLoading && filterDialogType === 'add-genes' ? 'Processing...' : 'Add Genes'}
      </Button>
      <Tooltip title={!connectedJobId ? "Connect a Job first to enable this filter" : ""} placement="right">
        <span>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={filterLoading && filterDialogType === 'add-protein-id' ? <CircularProgress size={16} /> : <FingerprintIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => onFilterClick(e, 'add-protein-id')}
            disabled={filterLoading || !sheetData || !connectedJobId}
            sx={{ 
              textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5,
              color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
            }}
          >
            {filterLoading && filterDialogType === 'add-protein-id' ? 'Processing...' : 'Add Protein ID'}
          </Button>
        </span>
      </Tooltip>
      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={filterLoading && filterDialogType === 'remove-contaminants' ? <CircularProgress size={16} /> : <DeleteSweepIcon sx={{ fontSize: 16 }} />}
        onClick={(e) => onFilterClick(e, 'remove-contaminants')}
        disabled={filterLoading || !sheetData}
        color="error"
        sx={{ 
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5
        }}
      >
        {filterLoading && filterDialogType === 'remove-contaminants' ? 'Processing...' : 'Remove Contaminants'}
      </Button>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={filterLoading && filterDialogType === 'filter-numeric' ? <CircularProgress size={16} /> : <ScienceIcon sx={{ fontSize: 16 }} />}
        onClick={(e) => onFilterNumericClick(e)}
        disabled={filterLoading || !sheetData}
        sx={{ 
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5,
          color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
        }}
      >
        {filterLoading && filterDialogType === 'filter-numeric' ? 'Processing...' : 'Filter Numeric'}
      </Button>

      <Button
        variant="text"
        size="small"
        onClick={onResetFilters}
        sx={{ textTransform: 'none', color: 'primary.main', fontWeight: 500, mb: 1.5, alignSelf: 'flex-start', fontSize: '12px', p: 0, minWidth: 0 }}
      >
        Clear Search
      </Button>

      <Divider sx={{ mb: 1.5 }} />

      {/* Enrich */}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>
        Enrich
      </Typography>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={idMappingRunning ? <CircularProgress size={16} /> : <SwapHorizIcon sx={{ fontSize: 16 }} />}
        onClick={onIdMappingClick}
        disabled={idMappingRunning || !sheetData}
        sx={{
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5,
          color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
        }}
      >
        {idMappingRunning ? 'Mapping IDs...' : 'Enrich IDs'}
      </Button>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
        onClick={onCompareClick}
        disabled={!sheetData}
        sx={{
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5,
          color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
        }}
      >
        Compare Datasets
      </Button>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={<ScienceIcon sx={{ fontSize: 16 }} />}
        onClick={onCrossValClick}
        disabled={!sheetData}
        sx={{
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, mb: 1, fontSize: '12px', borderRadius: 1.5,
          color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
        }}
      >
        Cross-Validate Rounds
      </Button>

      <Divider sx={{ mb: 1.5 }} />

      {/* AI Predictions */}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>
        AI Predictions
      </Typography>

      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={esmRunning ? <CircularProgress size={16} /> : <PsychologyIcon sx={{ fontSize: 16 }} />}
        onClick={onEsmClick}
        disabled={!esmAvailable || esmRunning || !sheetData}
        sx={{
          textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600, fontSize: '12px', borderRadius: 1.5,
          color: 'text.primary', borderColor: 'divider', '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
        }}
      >
        {esmRunning ? 'Running ESM-1v...' : 'ESM-1v Score'}
      </Button>
      {!esmAvailable && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Not available on this server
        </Typography>
      )}
    </Box>
  );
};
