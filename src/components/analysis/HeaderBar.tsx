import React, { useState, useRef } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, Popover, Divider, FormControlLabel, Checkbox } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface HeaderBarProps {
  sheetName: string;
  totalRows: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredColumns: string[];
  hiddenColumns: string[];
  onToggleColumn: (col: string) => void;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
  onDownload: () => void;
  onNewAnalysis: () => void;
  onDeleteSession?: () => void;
  onOpenJobsDrawer?: () => void;
  onImportFiles?: (files: File[]) => void;
}

const headerOutlinedButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: 1.5,
  height: 36,
  px: 1.5,
  borderColor: 'divider',
  color: 'text.primary',
  bgcolor: 'background.paper',
  '&:hover': {
    borderColor: 'primary.main',
    color: 'primary.main',
    bgcolor: 'rgba(82, 72, 162, 0.04)',
  },
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  sheetName, totalRows, searchQuery, setSearchQuery,
  filteredColumns, hiddenColumns, onToggleColumn, onShowAllColumns, onHideAllColumns,
  onDownload, onNewAnalysis, onDeleteSession, onOpenJobsDrawer, onImportFiles
}) => {
  const [colAnchor, setColAnchor] = useState<null | HTMLElement>(null);
  const [columnSearch, setColumnSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayColumns = filteredColumns.filter(c => !columnSearch.trim() || c.toLowerCase().includes(columnSearch.toLowerCase()));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportFiles) {
      onImportFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>Data Analysis</Typography>
        <Typography variant="caption" color="text.secondary">
          {totalRows} rows — {sheetName}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { 
              fontSize: '13px', 
              bgcolor: 'background.default',
              borderRadius: 1.5,
              width: 180,
            }
          }}
        />

        {onImportFiles && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".xlsx,.csv"
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<NoteAddIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={headerOutlinedButtonSx}
            >
              Import File
            </Button>
          </>
        )}

        {onOpenJobsDrawer && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenJobsDrawer}
            sx={headerOutlinedButtonSx}
          >
            My Jobs
          </Button>
        )}

        <Button
          variant="outlined"
          size="small"
          startIcon={<ViewColumnIcon />}
          onClick={(e) => setColAnchor(e.currentTarget)}
          sx={headerOutlinedButtonSx}
        >
          Columns
        </Button>
        
        <Popover
          anchorEl={colAnchor}
          open={Boolean(colAnchor)}
          onClose={() => setColAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 280, maxHeight: 450, p: 2, mt: 1, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'block' }}>
            Visible Columns
          </Typography>
          
          <TextField
            size="small"
            placeholder="Find column..."
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            autoFocus
            fullWidth
            sx={{ mb: 1.5 }}
            InputProps={{ sx: { fontSize: '13px', borderRadius: 1.5 } }}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button fullWidth size="small" variant="outlined" onClick={onShowAllColumns} sx={{ textTransform: 'none', fontSize: '11px', borderRadius: 1.5 }}>
              Show all
            </Button>
            <Button fullWidth size="small" variant="outlined" onClick={onHideAllColumns} sx={{ textTransform: 'none', fontSize: '11px', borderRadius: 1.5 }}>
              Hide all
            </Button>
          </Box>

          <Divider sx={{ mb: 1 }} />

          <Box sx={{ maxHeight: 250, overflowY: 'auto', pr: 1 }}>
            {displayColumns.map(col => (
              <Box key={col} sx={{ 
                display: 'flex', 
                alignItems: 'center',
                py: 0.2,
                '&:hover': { bgcolor: 'background.default' },
                borderRadius: 1
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!hiddenColumns.includes(col)}
                      onChange={() => onToggleColumn(col)}
                      size="small"
                    />
                  }
                  label={<Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px' }}>{col}</Typography>}
                  sx={{ m: 0, width: '100%' }}
                />
              </Box>
            ))}
          </Box>
        </Popover>

        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            borderRadius: 1.5,
            height: 36,
            px: 1.75,
            boxShadow: 'none',
          }}
        >
          Download
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={onNewAnalysis}
          sx={headerOutlinedButtonSx}
        >
          New Analysis
        </Button>

        {onDeleteSession && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDeleteSession}
            sx={headerOutlinedButtonSx}
          >
            Delete Session
          </Button>
        )}
      </Box>
    </Box>
  );
};
