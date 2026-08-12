import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  format: string;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose, format }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Peptide Processor Help
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>How it works</Typography>
        <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
          The Peptide Processor takes genetic mutation data and applies it to protein sequences. 
          It generates three main outputs for your research:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li><Typography variant="body2"><strong>dbpepmutref:</strong> Detailed relationship between mutations and identified peptides.</Typography></li>
          <li><Typography variant="body2"><strong>dbsaida:</strong> Mutated protein sequences in standard FASTA format.</Typography></li>
          <li><Typography variant="body2"><strong>dbfinal:</strong> Concatenated database optimized for mass spectrometry search engines.</Typography></li>
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Input Format Required (HGVS Standard)</Typography>
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1.5, border: 1, borderColor: 'divider', fontFamily: 'monospace', fontSize: '13px', color: 'primary.main', mb: 2 }}>
          {format}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Accepted inputs include standard HGVS notation (e.g. <code>NP_000123.1:p.Arg175His</code> or <code>NM_000123.3:c.102del</code>). The optional <code>rsID</code> column can be provided before or after the HGVS string, separated by tab or space.
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
