import { forwardRef } from 'react';
import { Box, Typography, Paper, IconButton, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface JobOutputView {
  type: string;
  // missing: o Job nao gerou a saida; error: existe mas nao foi possivel carregar
  status: 'ok' | 'missing' | 'error';
  content: string;
}

export interface JobSummary {
  accepted: number;
  rejected: number;
  rejected_lines: { line: string; reason: string }[];
  replaced_versions: number;
  replaced_lines: { line: string; reason: string }[];
}

export interface JobResultsData {
  outputs: JobOutputView[];
  summary: JobSummary | null;
  error?: string;
}

interface ResultsViewerProps {
  loading: boolean;
  data: JobResultsData | null;
  onClose: () => void;
}

const OUTPUT_LABELS: Record<string, string> = {
  relation: 'dbpepmutref (relation)',
  fasta: 'dbsaida (FASTA)',
  dbf: 'dbfinal (FASTA)',
  inframe: 'In-frame peptides (FASTA)',
  ext: 'Extension peptides (FASTA)',
};

const PREVIEW_LINES = 10;
const SUMMARY_LINES = 20;

const outputText = (o: JobOutputView) => {
  if (o.status === 'missing') return 'Not generated for this job.';
  if (o.status === 'error') return 'Could not load this output. Try downloading the ZIP.';
  return o.content.split('\n').slice(0, PREVIEW_LINES).join('\n') || 'Output is empty.';
};

export const ResultsViewer = forwardRef<HTMLDivElement, ResultsViewerProps>(({ loading, data, onClose }, ref) => {
  if (!loading && !data) return null;

  return (
    <div ref={ref} style={{ scrollMarginTop: '24px' }}>
      <Paper variant="outlined" sx={{ mt: 4, borderRadius: 1.5, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Analysis Results</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : data ? (
            <Box>
              {data.error && <Alert severity="error" sx={{ mb: 2 }}>{data.error}</Alert>}

              {data.summary && (
                <Alert severity={data.summary.rejected > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {data.summary.accepted} line(s) processed, {data.summary.rejected} rejected
                    {data.summary.replaced_versions > 0 && `, ${data.summary.replaced_versions} with transcript version replaced`}
                  </Typography>
                  {data.summary.rejected_lines.length > 0 && (
                    <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                      {data.summary.rejected_lines.slice(0, SUMMARY_LINES).map((r, i) => (
                        <li key={i}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.line}</Typography>
                          <Typography variant="caption"> — {r.reason}</Typography>
                        </li>
                      ))}
                    </Box>
                  )}
                  {data.summary.rejected > SUMMARY_LINES && (
                    <Typography variant="caption">Showing {SUMMARY_LINES} of {data.summary.rejected}. The full list is in the ZIP.</Typography>
                  )}
                </Alert>
              )}

              {data.outputs.map((o) => (
                <Accordion key={o.type} defaultExpanded={o.status === 'ok'} variant="outlined" sx={{ mb: 1, borderRadius: 1.5 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 600 }}>{OUTPUT_LABELS[o.type] || o.type}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: 'divider' }}>
                    <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'background.default', overflowX: 'auto', fontFamily: "monospace", fontSize: '13px', color: o.status === 'error' ? 'error.main' : 'text.primary' }}>
                      {outputText(o)}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : null}
        </Box>
      </Paper>
    </div>
  );
});
