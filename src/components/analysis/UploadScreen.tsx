import React, { useState } from 'react';
import { Box, Typography, Button, Container, Paper, CircularProgress, Stack, Divider } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import ScienceIcon from '@mui/icons-material/Science';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { FileDropzone } from '../FileDropzone';

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
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: 'calc(100vh - 48px)' }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-.3px', mb: 0.5 }}>
            Analysis Tool
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload proteomics data to explore, filter, cross-validate and export your results
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 4, borderTop: 3, borderTopStyle: 'solid', borderColor: 'primary.main', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Upload Data Files (Single or Multiple)
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FileDropzone
                  accept=".xlsx,.csv"
                  onFileSelect={setSelectedFiles}
                  selectedFiles={selectedFiles}
                  hint="Supported: .xlsx, .csv — Drop 1 or more files to analyze/compare"
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
              </Box>
            </Paper>
          </Grid>

          <Grid xs={12} md={6}>
            <Box sx={{ px: { xs: 0, md: 2 }, py: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  color: 'primary.main',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  mb: 2.5,
                  display: 'block',
                }}
              >
                Workflow Notes
              </Typography>

              <Stack divider={<Divider />} spacing={2.25}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    1. Explore & Clean
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    Browse multiple sheets from PatternLab or compatible engines, search across the full table, toggle columns, and remove contaminants with row-count preview.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    2. Cross-Validate (R1 vs R2)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    Drop paired reference and variant search files, import additional sheets from the top bar, or click <strong>Compare Example (R1 vs R2)</strong> to test the two-stage workflow.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    3. Annotate & Score
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    Connect Peptide Processor jobs for provenance, map RefSeq/UniProt IDs and gene symbols, and compute ESM-1v LLR scores for missense candidates.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
