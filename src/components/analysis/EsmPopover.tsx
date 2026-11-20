import React, { useState, useEffect } from 'react';
import {
  Popover, Button, FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Alert, FormControlLabel, Checkbox
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface EsmPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (params: {
    col_sequence: string;
    col_position: string;
    col_old_aa: string;
    col_new_aa: string;
    notify_email?: boolean;
  }) => void;
  columns: string[];
  totalRows?: number;
  maxRows?: number;
}

export const EsmPopover: React.FC<EsmPopoverProps> = ({
  anchorEl, onClose, onConfirm, columns, totalRows = 0, maxRows = 200
}) => {
  const { isAuthenticated } = useAuth();
  const [colunaSeq, setColunaSeq] = useState('');
  const [colunaPos, setColunaPos] = useState('');
  const [colunaOld, setColunaOld] = useState('');
  const [colunaNew, setColunaNew] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(false);

  const isBlockedGuest = !isAuthenticated;
  const isOverRowLimit = isAuthenticated && totalRows > maxRows;
  const isDisabled = isBlockedGuest || isOverRowLimit;

  // Limpa estados ao abrir popover
  useEffect(() => {
    if (anchorEl) {
      setColunaSeq('');
      setColunaPos('');
      setColunaOld('');
      setColunaNew('');
      setNotifyEmail(false);
    }
  }, [anchorEl]);

  const enviarConfirmacao = () => {
    onConfirm({
      col_sequence: colunaSeq,
      col_position: colunaPos,
      col_old_aa: colunaOld,
      col_new_aa: colunaNew,
      notify_email: notifyEmail,
    });
  };

  const prontoParaEnviar =
    !isDisabled &&
    colunaSeq !== '' &&
    colunaPos !== '' &&
    colunaOld !== '' &&
    colunaNew !== '';

  const aberto = Boolean(anchorEl);

  return (
    <Popover
      open={aberto}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: {
            width: 340,
            p: 2.5,
            ml: 1,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.95rem' }}>
        ESM-1v AI Predictor
      </Typography>
      
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, lineHeight: 1.3, fontSize: '0.8rem' }}>
        Predict the functional impact of missense mutations using Meta's ESM-1v language model
      </Typography>

      {isBlockedGuest ? (
        <Alert
          severity="info"
          icon={<LockOutlinedIcon fontSize="inherit" />}
          sx={{ mb: 2, fontSize: '0.8rem', py: 0.5 }}
        >
          ESM-1v scoring is available to registered users only. Please{' '}
          <RouterLink to="/register" style={{ fontWeight: 600, color: '#5248A2' }}>
            create a free account
          </RouterLink>{' '}
          or{' '}
          <RouterLink to="/login" style={{ fontWeight: 600, color: '#5248A2' }}>
            sign in
          </RouterLink>{' '}
          to run predictions.
        </Alert>
      ) : isOverRowLimit ? (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem', py: 0.5 }}>
          ESM-1v is limited to {maxRows} rows per run (current sheet has {totalRows} rows). Filter your dataset before running.
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.75rem', py: 0.5 }}>
          Runs asynchronously in the background (up to {maxRows} rows per run, 1 active ESM-1v task per user).
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControl fullWidth size="small" disabled={isDisabled}>
          <InputLabel>Sequence Column</InputLabel>
          <Select
            value={colunaSeq}
            label="Sequence Column"
            onChange={(e) => setColunaSeq(e.target.value)}
          >
            {columns.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" disabled={isDisabled}>
          <InputLabel>Position Column</InputLabel>
          <Select
            value={colunaPos}
            label="Position Column"
            onChange={(e) => setColunaPos(e.target.value)}
          >
            {columns.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" disabled={isDisabled}>
          <InputLabel>Original AA Column</InputLabel>
          <Select
            value={colunaOld}
            label="Original AA Column"
            onChange={(e) => setColunaOld(e.target.value)}
          >
            {columns.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" disabled={isDisabled}>
          <InputLabel>Mutant AA Column</InputLabel>
          <Select
            value={colunaNew}
            label="Mutant AA Column"
            onChange={(e) => setColunaNew(e.target.value)}
          >
            {columns.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {isAuthenticated && !isDisabled && (
          <Box sx={{ mt: -0.5, mb: -0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Notify me by email when the analysis finishes
                </Typography>
              }
            />
          </Box>
        )}

        <Button 
          variant="contained" 
          onClick={enviarConfirmacao} 
          disabled={!prontoParaEnviar}
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {isBlockedGuest ? 'Sign in to Run' : isOverRowLimit ? `Limit: ${maxRows} Rows` : 'Run Predictions'}
        </Button>
      </Box>
    </Popover>
  );
};
