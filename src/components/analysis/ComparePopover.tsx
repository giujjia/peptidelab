import React, { useState, useEffect } from 'react';
import {
  Popover, Button, FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Alert
} from '@mui/material';
import { SheetInfo } from '../../types';

interface ComparePopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (params: { sheet_a: string; sheet_b: string; col_key: string }) => void;
  sheets: string[];
  activeSheet: string;
  sheetsInfo: Record<string, SheetInfo>;
}

export const ComparePopover: React.FC<ComparePopoverProps> = ({
  anchorEl, onClose, onConfirm, sheets, activeSheet, sheetsInfo
}) => {
  const [sheetA, setSheetA] = useState('');
  const [sheetB, setSheetB] = useState('');
  const [colKey, setColKey] = useState('');
  const [colunasEmComum, setColunasEmComum] = useState<string[]>([]);

  // Pre-seleciona a aba ativa como dataset A ao abrir
  useEffect(() => {
    if (anchorEl) {
      setSheetA(activeSheet);
      setSheetB('');
      setColKey('');
    }
  }, [anchorEl, activeSheet]);

  // Calcula interseção das colunas ao alterar as abas selecionadas
  useEffect(() => {
    if (sheetA && sheetB && sheetsInfo[sheetA] && sheetsInfo[sheetB]) {
      const colsA = sheetsInfo[sheetA].columns || [];
      const colsB = sheetsInfo[sheetB].columns || [];
      const comuns = colsA.filter(c => colsB.includes(c));
      setColunasEmComum(comuns);
      if (!comuns.includes(colKey)) {
        setColKey('');
      }
    } else {
      setColunasEmComum([]);
      setColKey('');
    }
  }, [sheetA, sheetB, sheetsInfo]);

  const aberto = Boolean(anchorEl);
  const pronto = sheetA !== '' && sheetB !== '' && colKey !== '' && sheetA !== sheetB;

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
        Compare Datasets
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.3 }}>
        Find rows with matching values across two sheets. Results are saved as a new tab.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Dataset A</InputLabel>
          <Select
            value={sheetA}
            label="Dataset A"
            onChange={(e) => setSheetA(e.target.value)}
          >
            {sheets.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Dataset B</InputLabel>
          <Select
            value={sheetB}
            label="Dataset B"
            onChange={(e) => setSheetB(e.target.value)}
          >
            {sheets.filter(s => s !== sheetA).map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {sheetA && sheetB && colunasEmComum.length === 0 && (
          <Alert severity="warning" sx={{ fontSize: '11px', py: 0.5 }}>
            No columns with matching names found between these sheets.
          </Alert>
        )}

        <FormControl fullWidth size="small" disabled={colunasEmComum.length === 0}>
          <InputLabel>Key Column</InputLabel>
          <Select
            value={colKey}
            label="Key Column"
            onChange={(e) => setColKey(e.target.value)}
          >
            {colunasEmComum.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={() => onConfirm({ sheet_a: sheetA, sheet_b: sheetB, col_key: colKey })}
          disabled={!pronto}
          fullWidth
          sx={{ mt: 0.5 }}
        >
          Find Intersection
        </Button>
      </Box>
    </Popover>
  );
};
