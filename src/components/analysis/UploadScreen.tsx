import React, { useState } from 'react';
import { Box, Typography, Button, Container, Paper, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import ScienceIcon from '@mui/icons-material/Science';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { FileDropzone } from '../FileDropzone';
import { useAuth } from '../../contexts/AuthContext';

interface UploadScreenProps {
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onLoadExample: () => void;
  onLoadCompareExample?: () => void;
  onOpenJobsDrawer?: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  uploading,
  onUpload,
  onLoadExample,
  onLoadCompareExample,
  onOpenJobsDrawer
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { user } = useAuth();

  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: 'calc(100vh - 48px)' }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-.3px', mb: 0.5 }}>
              Analysis Tool
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload proteomics data to explore, filter, cross-validate and export your results
            </Typography>
          </Box>
          {user && onOpenJobsDrawer && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FolderOpenIcon />}
              onClick={onOpenJobsDrawer}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              My Saved Jobs & History
            </Button>
          )}
        </Box>

        <Grid container spacing={4}>
          <Grid xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 4, borderTop: 3, borderTopStyle: 'solid', borderColor: 'primary.main', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Upload Data Files (Single or Multiple)
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FileDropzone
                  accept=".xlsx,.xls,.csv"
                  onFileSelect={setSelectedFiles}
                  selectedFiles={selectedFiles}
                  hint="Supported: .xlsx, .xls, .csv — Drop 1 or more files to analyze/compare"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={() => selectedFiles.length > 0 && onUpload(selectedFiles)}
                  disabled={selectedFiles.length === 0 || uploading}
                  startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <ScienceIcon />}
                  sx={{ flex: 1, minWidth: 160, textTransform: 'none', fontWeight: 600 }}
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
                {onLoadCompareExample && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={onLoadCompareExample}
                    disabled={uploading}
                    startIcon={<CompareArrowsIcon sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Compare Example (R1 vs R2)
                  </Button>
                )}
                {user && onOpenJobsDrawer && (
                  <Button
                    variant="outlined"
                    onClick={onOpenJobsDrawer}
                    disabled={uploading}
                    startIcon={<FolderOpenIcon />}
                    sx={{ textTransform: 'none', fontWeight: 500 }}
                  >
                    From My Jobs
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
                About this tool
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Upload results from PatternLab or similar proteomics software, browse data across multiple sheets, toggle column visibility, and apply scientific filters such as gene annotations, contaminant removal, and ESM-1v scoring.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
                <strong>Comparing Datasets?</strong> Drop multiple files (e.g. Round 1 Canonical vs Round 2 Mutated), import additional files directly from the top bar once inside the workspace, or click <strong>Compare Example (R1 vs R2)</strong> to test the two-stage search validation workflow.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
