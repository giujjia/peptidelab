import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Container, Paper, CircularProgress, Button } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useJobPolling } from '../hooks/useJobPolling';
import { api } from '../services/api';
import { downloadBlob } from '../utils/download';
import { mutationTypes } from '../components/processor/constants';
import { MutationTypeSelector } from '../components/processor/MutationTypeSelector';
import { JobForm } from '../components/processor/JobForm';
import { JobsList } from '../components/processor/JobsList';
import { ResultsViewer } from '../components/processor/ResultsViewer';
import { HelpDialog } from '../components/processor/HelpDialog';

const GuestHistoryNotice: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Sign in to save history
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
        Guest Mode does not persist results. Sign in to save your history and process larger datasets.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/login')} sx={{ px: 4 }}>
        Sign In
      </Button>
    </Paper>
  );
};

export const Processor: React.FC = () => {
  const { notify } = useNotification();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [mutationType, setMutationType] = useState("missense");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [viewJobData, setViewJobData] = useState<{ relation: string, fasta: string, dbf: string } | null>(null);
  const [viewJobLoading, setViewJobLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Geracao da visualizacao; respostas de pedidos anteriores ou de outra identidade sao descartadas
  const viewRequestRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      viewRequestRef.current += 1;
      setViewJobData(null);
      setViewJobLoading(false);
    }
  }, [isAuthenticated]);

  const handleCloseResults = () => {
    viewRequestRef.current += 1;
    setViewJobData(null);
    setViewJobLoading(false);
  };

  const { jobs, fetchJobs } = useJobPolling(isAuthenticated);
  const current = mutationTypes.find((m) => m.id === mutationType)!;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: "calc(100vh - 48px)" }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleProcessData = async (inputMode: string, text: string, file: File | null) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('mutation_type', mutationType);
    formData.append('input_mode', inputMode);
    
    if (inputMode === 'text') {
      formData.append('input_text', text);
    } else if (file) {
      formData.append('file', file);
    }

    if (isAuthenticated) {
      try {
        await api.post('/jobs/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        notify('Job submitted successfully', 'success');
        await fetchJobs();
      } catch (err) {
        console.error("Error creating job", err);
        notify('Failed to submit job');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const response = await api.post('/jobs/guest', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        });
        const blob = new Blob([response.data], { type: 'application/zip' });
        downloadBlob(blob, 'peptidelab_guest_results.zip');
        notify('Processing completed! Your download has started.', 'success');
      } catch (err: any) {
        console.error("Error processing guest data", err);
        let errorMsg = 'Unable to process guest request.';
        
        if (err.response && err.response.data instanceof Blob) {
          try {
            const errorText = await err.response.data.text();
            const errorJson = JSON.parse(errorText);
            if (errorJson && errorJson.detail) {
              errorMsg = errorJson.detail;
            }
          } catch (parseErr) {
            console.error("Failed to parse error blob as JSON", parseErr);
          }
        } else if (err.response && err.response.data && err.response.data.detail) {
          errorMsg = err.response.data.detail;
        }
        
        notify(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };



  const handleRunExample = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post(`/processor/run-example/${mutationType}`, {}, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/zip" });
      downloadBlob(blob, `peptidelab_example_${mutationType}.zip`);
      notify(`Example for ${current.label} processed! Results downloaded without registering a permanent job.`, "success");
    } catch (err: any) {
      console.error("Error running example", err);
      notify("Failed to process example");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadExampleText = async (): Promise<string> => {
    try {
      const res = await api.get(`/processor/examples/${mutationType}`);
      if (res.data && res.data.content) {
        notify(`Sample data loaded for ${current.label}`, "info");
        return res.data.content;
      }
    } catch (err) {
      console.error("Failed to load example text", err);
      notify("Failed to load sample text");
    }
    return "";
  };

  const handleViewJob = async (jobId: string) => {
    const request = ++viewRequestRef.current;
    setViewJobLoading(true);
    setViewJobData(null);
    
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const [relRes, fastaRes, dbfRes] = await Promise.all([
        api.get(`/jobs/${jobId}/outputs/relation`, { responseType: 'text' }).catch(() => ({ data: '' })),
        api.get(`/jobs/${jobId}/outputs/fasta`, { responseType: 'text' }).catch(() => ({ data: '' })),
        api.get(`/jobs/${jobId}/outputs/dbf`, { responseType: 'text' }).catch(() => ({ data: '' }))
      ]);
      if (request !== viewRequestRef.current) return;
      setViewJobData({ relation: relRes.data, fasta: fastaRes.data, dbf: dbfRes.data });
    } catch (err) {
      console.error(err);
      if (request !== viewRequestRef.current) return;
      setViewJobData({ relation: 'Error loading results', fasta: '', dbf: '' });
    } finally {
      if (request === viewRequestRef.current) setViewJobLoading(false);
    }
  };

  const handleDownloadZip = async (jobId: string) => {
    try {
      const response = await api.get(`/jobs/${jobId}/outputs/zip`, { responseType: 'blob' });
      downloadBlob(new Blob([response.data]), `peptidelab_job_${jobId}_outputs.zip`);
    } catch (err) {
      console.error(err);
      notify('Failed to download ZIP file');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await api.delete(`/jobs/${jobId}`);
      notify('Job deleted successfully', 'success');
      await fetchJobs();
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to delete job', 'error');
    }
  };

  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: "calc(100vh - 48px)" }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-.3px", mb: 0.5 }}>
            Peptide Processor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select the mutation type and submit your data for processing
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderTop: '3px solid', borderColor: 'primary.main', p: 3 }}>
              <MutationTypeSelector 
                value={mutationType} 
                onChange={setMutationType} 
              />
              
              <JobForm 
                currentFormat={current.format}
                currentPlaceholder={current.placeholder}
                isSubmitting={isSubmitting}
                onSubmit={handleProcessData}
                onRunExample={handleRunExample}
                onLoadExampleText={handleLoadExampleText}
                onShowHelp={() => setShowHelp(true)}
                isAuthenticated={isAuthenticated}
                mutationType={mutationType}
              />
            </Paper>
          </Grid>

          <Grid xs={12} md={6}>
            {isAuthenticated ? (
              <JobsList 
                jobs={jobs}
                isAuthenticated={isAuthenticated}
                currentMutationLabel={current.label}
                onViewJob={handleViewJob}
                onDownloadZip={handleDownloadZip}
                onDeleteJob={handleDeleteJob}
              />
            ) : (
              <GuestHistoryNotice />
            )}
          </Grid>
        </Grid>

        <ResultsViewer 
          ref={resultsRef}
          loading={viewJobLoading}
          data={viewJobData}
          onClose={handleCloseResults}
        />

        <HelpDialog 
          open={showHelp}
          onClose={() => setShowHelp(false)}
          format={current.format}
        />
      </Container>
    </Box>
  );
};
