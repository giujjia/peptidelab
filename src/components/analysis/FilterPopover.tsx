import React, { useState, useEffect } from 'react';
import {
  Popover, Button, FormControl, InputLabel, Select, MenuItem, Typography, Box, TextField
} from '@mui/material';

interface FilterPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (params: Record<string, string>) => void;
  title: string;
  description: string;
  columns: string[];
  type: 'add-genes' | 'add-protein-id' | 'remove-contaminants' | 'filter-numeric';
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  anchorEl, onClose, onConfirm, title, description, columns, type
}) => {
  const [targetColumn, setTargetColumn] = useState('');
  const [keyword, setKeyword] = useState('contaminant');
  const [operator, setOperator] = useState('<');
  const [threshold, setThreshold] = useState('0.01');

  // Reset local state when popover opens
  useEffect(() => {
    if (anchorEl) {
      setTargetColumn('');
      setKeyword('contaminant');
      setOperator('<');
      setThreshold('0.01');
    }
  }, [anchorEl, type]);

  const handleConfirm = () => {
    if (type === 'add-genes') {
      onConfirm({ target_column: targetColumn });
    } else if (type === 'remove-contaminants') {
      onConfirm({ target_column: targetColumn, keyword });
    } else if (type === 'add-protein-id') {
      onConfirm({ target_sequence_column: targetColumn });
    } else if (type === 'filter-numeric') {
      onConfirm({ target_column: targetColumn, operator, threshold });
    }
  };

  const isReady = targetColumn !== '' && 
    (type === 'remove-contaminants' ? keyword !== '' : true) &&
    (type === 'filter-numeric' ? threshold.trim() !== '' && Number.isFinite(Number(threshold)) : true);

  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
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
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.3 }}>
        {description}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>{type === 'add-protein-id' ? 'Sequence Column' : 'Target Column'}</InputLabel>
          <Select
            value={targetColumn}
            label={type === 'add-protein-id' ? 'Sequence Column' : 'Target Column'}
            onChange={(e) => setTargetColumn(e.target.value)}
          >
            {columns.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {type === 'remove-contaminants' && (
          <TextField
            fullWidth
            size="small"
            label="Contaminant pattern (regex)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. contaminant"
            helperText="Regular expression, case insensitive. Use \. to match a literal dot. You will see how many rows match before anything is removed."
          />
        )}

        {type === 'filter-numeric' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ width: 100 }}>
              <InputLabel>Op</InputLabel>
              <Select
                value={operator}
                label="Op"
                onChange={(e) => setOperator(e.target.value)}
              >
                <MenuItem value="<">{'<'}</MenuItem>
                <MenuItem value="<=">{'<='}</MenuItem>
                <MenuItem value=">">{'>'}</MenuItem>
                <MenuItem value=">=">{'>='}</MenuItem>
                <MenuItem value="==">{'=='}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 0.01"
            />
          </Box>
        )}

        <Button 
          variant="contained" 
          onClick={handleConfirm} 
          disabled={!isReady}
          fullWidth
          sx={{ mt: 1 }}
        >
          Apply Filter
        </Button>
      </Box>
    </Popover>
  );
};
