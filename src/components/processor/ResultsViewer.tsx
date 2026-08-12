import { forwardRef } from 'react';
import { Box, Typography, Paper, IconButton, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ResultsViewerProps {
  loading: boolean;
  data: { relation: string, fasta: string, dbf: string } | null;
  onClose: () => void;
}

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
              <Accordion defaultExpanded variant="outlined" sx={{ mb: 1, borderRadius: 1.5 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>dbpepmutref</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: 'divider' }}>
                  <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'background.default', overflowX: 'auto', fontFamily: "monospace", fontSize: '13px', color: 'text.primary' }}>
                    {data.relation.split('\n').slice(0, 10).join('\n') || 'No results generated.'}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded variant="outlined" sx={{ mb: 1, borderRadius: 1.5 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>dbsaida (FASTA)</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: 'divider' }}>
                  <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'background.default', overflowX: 'auto', fontFamily: "monospace", fontSize: '13px', color: 'text.primary' }}>
                    {data.fasta?.split('\n').slice(0, 10).join('\n') || 'No results generated.'}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 1.5 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>dbfinal (FASTA)</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: 'divider' }}>
                  <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'background.default', overflowX: 'auto', fontFamily: "monospace", fontSize: '13px', color: 'text.primary' }}>
                    {data.dbf?.split('\n').slice(0, 10).join('\n') || 'No results generated.'}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : null}
        </Box>
      </Paper>
    </div>
  );
});
