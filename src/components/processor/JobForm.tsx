import React, { useState } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, CircularProgress } from '@mui/material';
import { FileDropzone } from '../FileDropzone';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '../../services/api';
import { downloadBlob } from '../../utils/download';

interface JobFormProps {
  currentFormat: string;
  currentPlaceholder: string;
  isSubmitting: boolean;
  onSubmit: (inputMode: string, text: string, file: File | null) => void;
  onShowHelp: () => void;
  isAuthenticated: boolean;
}

export const JobForm: React.FC<JobFormProps> = ({ 
  currentFormat, 
  currentPlaceholder, 
  isSubmitting, 
  onSubmit, 
  onShowHelp,
  isAuthenticated
}) => {
  const [inputMode, setInputMode] = useState("text");
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleReset = () => {
    setInputValue("");
    setSelectedFile(null);
  };

  const handleSubmit = () => {
    onSubmit(inputMode, inputValue, selectedFile);
  };

  const getLineCount = (text: string) => {
    return text.split('\n').map(l => l.trim()).filter(Boolean).length;
  };

  const isTextLimitExceeded = !isAuthenticated && inputMode === 'text' && getLineCount(inputValue) > 10;
  const isFileLimitExceeded = !isAuthenticated && inputMode === 'file' && !!selectedFile && selectedFile.size > 100 * 1024;

  const isDisabled = isSubmitting || 
    (inputMode === 'text' ? !inputValue : !selectedFile) || 
    isTextLimitExceeded || 
    isFileLimitExceeded;

  return (
    <>
      <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: ".1em", display: 'block', mb: 1 }}>
        Input data
      </Typography>
      
      <Tabs 
        value={inputMode} 
        onChange={(_, v) => setInputMode(v)} 
        sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600 } }}
      >
        <Tab label="Text Input" value="text" />
        <Tab label="File Upload" value="file" />
      </Tabs>

      {inputMode === "text" ? (
        <Box>
          <Box sx={{ bgcolor: 'primary.light', border: 1, borderColor: 'divider', p: 1, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>Format</Typography>
            <Typography variant="caption" sx={{ color: 'primary.dark' }}>{currentFormat}</Typography>
          </Box>
          <TextField
            multiline
            rows={4}
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            variant="outlined"
            InputProps={{ sx: { fontSize: '13px' } }}
          />
          {isTextLimitExceeded && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontWeight: 500 }}>
              Limit of 10 mutations exceeded for Guest Mode (currently {getLineCount(inputValue)}).
            </Typography>
          )}
        </Box>
      ) : (
        <Box>
          <FileDropzone 
            onFileSelect={(files) => setSelectedFile(files.length > 0 ? files[0] : null)} 
            selectedFiles={selectedFile ? [selectedFile] : []} 
            accept=".fasta,.csv,.xlsx,.txt"
          />
          {isFileLimitExceeded && selectedFile && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontWeight: 500 }}>
              File size exceeds the 100KB limit for Guest Mode (currently {(selectedFile.size / 1024).toFixed(1)}KB).
            </Typography>
          )}
        </Box>
      )}

      {!isAuthenticated && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}>
          Guest Mode: up to 10 mutations or a 100KB file. Sign in to save history and process larger jobs.
        </Typography>
      )}

      <Box sx={{ display: "flex", gap: 1, mt: 3, alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isDisabled}
          startIcon={isSubmitting && <CircularProgress size={16} color="inherit" />}
          sx={{ px: 3, py: 1 }}
        >
          {isSubmitting ? 'Processing...' : 'Process Data'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleReset}
          sx={{ minWidth: 0, p: 1 }}
          title="Reset form"
        >
          <RefreshIcon fontSize="small" />
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon fontSize="small" />}
          onClick={async () => {
            try {
              const res = await api.get('/processor/example-file', { responseType: 'blob' });
              downloadBlob(new Blob([res.data]), 'peptide_processor_example.tsv');
            } catch (err) {
              console.error("Failed to download example file", err);
            }
          }}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Sample File
        </Button>
        <Button
          startIcon={<HelpOutlineIcon />}
          onClick={onShowHelp}
          sx={{ ml: 'auto', color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}
        >
          Help
        </Button>
      </Box>
    </>
  );
};
