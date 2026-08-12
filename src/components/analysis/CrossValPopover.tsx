import React, { useState, useEffect } from 'react';
import {
  Popover, Button, FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Alert, TextField, FormControlLabel, Checkbox
} from '@mui/material';
import { SheetInfo } from '../../types';

interface CrossValPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (params: { 
    sheet_a: string; 
    sheet_b: string; 
    join_keys: string[];
    score_col_a: string;
    score_col_b: string;
    margin_percentage: number;
    higher_is_better: boolean;
  }) => void;
  sheets: string[];
  activeSheet: string;
  sheetsInfo: Record<string, SheetInfo>;
}

export const CrossValPopover: React.FC<CrossValPopoverProps> = ({
  anchorEl, onClose, onConfirm, sheets, activeSheet, sheetsInfo
}) => {
  const [sheetA, setSheetA] = useState('');
  const [sheetB, setSheetB] = useState('');
  const [joinKeys, setJoinKeys] = useState<string[]>([]);
  const [scoreColA, setScoreColA] = useState('');
  const [scoreColB, setScoreColB] = useState('');
  const [margin, setMargin] = useState<number>(20);
  const [higherIsBetter, setHigherIsBetter] = useState<boolean>(true);
  
  const [colunasEmComum, setColunasEmComum] = useState<string[]>([]);

  // Pre-seleciona a aba ativa como dataset B (Target) ao abrir
  useEffect(() => {
    if (anchorEl) {
      setSheetB(activeSheet);
      setSheetA('');
      setJoinKeys([]);
      setScoreColA('');
      setScoreColB('');
      setMargin(20);
      setHigherIsBetter(true);
    }
  }, [anchorEl, activeSheet]);

  // Calcula interseção das colunas ao alterar as abas selecionadas
  useEffect(() => {
    if (sheetA && sheetB && sheetsInfo[sheetA] && sheetsInfo[sheetB]) {
      const colsA = sheetsInfo[sheetA].columns || [];
      const colsB = sheetsInfo[sheetB].columns || [];
      const comuns = colsA.filter(c => colsB.includes(c));
      setColunasEmComum(comuns);
      setJoinKeys(prev => prev.filter(k => comuns.includes(k)));
      
      if (!colsA.includes(scoreColA)) setScoreColA('');
      if (!colsB.includes(scoreColB)) setScoreColB('');
    } else {
      setColunasEmComum([]);
      setJoinKeys([]);
      setScoreColA('');
      setScoreColB('');
    }
  }, [sheetA, sheetB, sheetsInfo]);

  const aberto = Boolean(anchorEl);
  const pronto = sheetA !== '' && sheetB !== '' && joinKeys.length > 0 && scoreColA !== '' && scoreColB !== '' && sheetA !== sheetB;

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
            width: 340,
            p: 2,
            ml: 1,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }
        }
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Cross-Validate Rounds
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.3 }}>
        Compare variant peptides (Round 2) against canonical (Round 1) scores with a required margin.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Round 2 Sheet (Target)</InputLabel>
          <Select
            value={sheetB}
            label="Round 2 Sheet (Target)"
            onChange={(e) => setSheetB(e.target.value)}
          >
            {sheets.map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Round 1 Sheet (Reference)</InputLabel>
          <Select
            value={sheetA}
            label="Round 1 Sheet (Reference)"
            onChange={(e) => setSheetA(e.target.value)}
          >
            {sheets.filter(s => s !== sheetB).map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {sheetA && sheetB && colunasEmComum.length === 0 && (
          <Alert severity="warning" sx={{ fontSize: '11px', py: 0.5 }}>
            No matching columns found to act as join keys.
          </Alert>
        )}

        <FormControl fullWidth size="small" disabled={colunasEmComum.length === 0}>
          <InputLabel>Join Keys (Multiple)</InputLabel>
          <Select
            multiple
            value={joinKeys}
            label="Join Keys (Multiple)"
            onChange={(e) => setJoinKeys(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            renderValue={(selected) => selected.join(', ')}
          >
            {colunasEmComum.map(col => (
              <MenuItem key={col} value={col}>{col}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl fullWidth size="small" disabled={!sheetB}>
            <InputLabel>Target Score (R2)</InputLabel>
            <Select
              value={scoreColB}
              label="Target Score (R2)"
              onChange={(e) => setScoreColB(e.target.value)}
            >
              {(sheetsInfo[sheetB]?.columns || []).map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" disabled={!sheetA}>
            <InputLabel>Reference Score (R1)</InputLabel>
            <Select
              value={scoreColA}
              label="Reference Score (R1)"
              onChange={(e) => setScoreColA(e.target.value)}
            >
              {(sheetsInfo[sheetA]?.columns || []).map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField 
            label="Margin (%)" 
            type="number" 
            size="small" 
            value={margin} 
            onChange={e => setMargin(Number(e.target.value))} 
            sx={{ width: '40%' }}
          />
          <FormControlLabel
            control={<Checkbox checked={higherIsBetter} onChange={(e) => setHigherIsBetter(e.target.checked)} />}
            label={<Typography variant="body2" sx={{ fontSize: 12 }}>Higher is Better</Typography>}
            sx={{ m: 0 }}
          />
        </Box>

        <Button
          variant="contained"
          onClick={() => onConfirm({ 
            sheet_a: sheetA, 
            sheet_b: sheetB, 
            join_keys: joinKeys,
            score_col_a: scoreColA,
            score_col_b: scoreColB,
            margin_percentage: margin,
            higher_is_better: higherIsBetter
          })}
          disabled={!pronto}
          fullWidth
          sx={{ mt: 0.5 }}
        >
          Run Cross-Validation
        </Button>
      </Box>
    </Popover>
  );
};
