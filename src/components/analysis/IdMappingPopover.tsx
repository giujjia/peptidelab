import React, { useState, useEffect } from 'react';
import {
  Popover, Button, FormControl, InputLabel, Select, MenuItem, Typography, Box
} from '@mui/material';

interface IdMappingPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (params: { col_origin: string }) => void;
  columns: string[];
}

export const IdMappingPopover: React.FC<IdMappingPopoverProps> = ({
  anchorEl, onClose, onConfirm, columns
}) => {
  const [colunaOrigem, setColunaOrigem] = useState('');

  // Limpa estado ao abrir
  useEffect(() => {
    if (anchorEl) setColunaOrigem('');
  }, [anchorEl]);

  const aberto = Boolean(anchorEl);

  return (
    <Popover
      open={aberto}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 300,
            p: 2,
            ml: 1,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }
        }
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        UniProt ID Mapping
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.3 }}>
        Maps RefSeq IDs (e.g. NP_XXXX) to UniProt accessions using a local database. Adds a new <strong>UniProt_ID</strong> column.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Origin ID Column</InputLabel>
          <Select
            value={colunaOrigem}
            label="Origin ID Column"
            onChange={(e) => setColunaOrigem(e.target.value)}
          >
            {columns.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={() => onConfirm({ col_origin: colunaOrigem })}
          disabled={colunaOrigem === ''}
          fullWidth
          sx={{ mt: 0.5 }}
        >
          Run Mapping
        </Button>
      </Box>
    </Popover>
  );
};
