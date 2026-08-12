import React, { useState } from 'react';
import { Box, Typography, Button, Container, Paper, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import ScienceIcon from '@mui/icons-material/Science';
import { FileDropzone } from '../FileDropzone';

interface UploadScreenProps {
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onLoadExample: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ uploading, onUpload, onLoadExample }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: 'calc(100vh - 48px)' }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-.3px', mb: 0.5 }}>
            Analysis Tool
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload proteomics data to explore, filter and export your results
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 4, borderTop: 3, borderTopStyle: 'solid', borderColor: 'primary.main', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Upload Data File
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FileDropzone
                  accept=".xlsx,.xls,.csv"
                  onFileSelect={setSelectedFiles}
                  selectedFiles={selectedFiles}
                  hint="Supported: .xlsx, .xls, .csv (Max 10 MB per file)"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => selectedFiles.length > 0 && onUpload(selectedFiles)}
                  disabled={selectedFiles.length === 0 || uploading}
                  startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <ScienceIcon />}
                  sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  {uploading ? 'Processing...' : 'Upload & Analyze'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={onLoadExample}
                  disabled={uploading}
                  sx={{ textTransform: 'none', fontWeight: 500 }}
                >
                  Example Data
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
                About this tool
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Upload results from PatternLab or similar proteomics software, browse data across multiple sheets, toggle column visibility, and apply scientific filters such as gene annotations and contaminant removal.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
                Not sure where to start? Click <strong>Example Data</strong> to load a sample proteomics dataset and explore the workspace.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
