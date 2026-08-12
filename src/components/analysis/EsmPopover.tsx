import React, { useState, useEffect } from 'react';
import {
  Popover, Button, FormControl, InputLabel, Select, MenuItem, Typography, Box, Alert
} from '@mui/material';

interface EsmPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (params: {
    col_sequence: string;
    col_position: string;
    col_old_aa: string;
    col_new_aa: string;
  }) => void;
  columns: string[];
}

export const EsmPopover: React.FC<EsmPopoverProps> = ({
  anchorEl, onClose, onConfirm, columns
}) => {
  const [colunaSeq, setColunaSeq] = useState('');
  const [colunaPos, setColunaPos] = useState('');
  const [colunaOld, setColunaOld] = useState('');
  const [colunaNew, setColunaNew] = useState('');

  // Limpa estados ao abrir popover
  useEffect(() => {
    if (anchorEl) {
      setColunaSeq('');
      setColunaPos('');
      setColunaOld('');
      setColunaNew('');
    }
  }, [anchorEl]);

  const enviarConfirmacao = () => {
    onConfirm({
      col_sequence: colunaSeq,
      col_position: colunaPos,
      col_old_aa: colunaOld,
      col_new_aa: colunaNew,
    });
  };

  const prontoParaEnviar =
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
            width: 320,
            p: 2,
            ml: 1,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }
        }
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        ESM-1v AI Predictor
      </Typography>
      
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, lineHeight: 1.3 }}>
        Predict the functional impact of missense mutations using Meta's ESM-1v language model
      </Typography>

      <Alert severity="warning" sx={{ mb: 2, fontSize: '11px', py: 0.5 }}>
        This process runs on CPU locally and can take a few minutes for larger datasets
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControl fullWidth size="small">
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

        <FormControl fullWidth size="small">
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

        <FormControl fullWidth size="small">
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

        <FormControl fullWidth size="small">
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

        <Button 
          variant="contained" 
          onClick={enviarConfirmacao} 
          disabled={!prontoParaEnviar}
          fullWidth
          sx={{ mt: 1 }}
        >
          Run Predictions
        </Button>
      </Box>
    </Popover>
  );
};
