import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  format: string;
  mutationType: string;
}

// Mesmas saidas que o backend gera para cada tipo (app/processors/dispatch.py)
const OUTPUTS_BY_TYPE: Record<string, { name: string; desc: string }[]> = {
  missense: [
    { name: 'dbpepmutref', desc: 'Relationship between each mutation and its mutated and reference peptides.' },
    { name: 'dbsaida', desc: 'Mutated peptide sequences in FASTA format.' },
    { name: 'dbfinal', desc: 'Concatenated database for mass spectrometry search engines (only when there are accepted mutations).' },
  ],
  stoploss: [
    { name: 'dbpepmutref', desc: 'Relationship between each stop-loss variant and its extended peptide.' },
    { name: 'dbsaida', desc: 'Extended peptide sequences in FASTA format.' },
  ],
  frameshift: [
    { name: 'frameshift', desc: 'Frameshifted peptide sequences in FASTA format.' },
    { name: 'inframe', desc: 'In-frame peptides produced by the variant, in FASTA format.' },
    { name: 'ext', desc: 'Extension peptides past the original stop codon, in FASTA format.' },
  ],
};
OUTPUTS_BY_TYPE.indel = OUTPUTS_BY_TYPE.missense;

export const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose, format, mutationType }) => {
  const outputs = OUTPUTS_BY_TYPE[mutationType] || OUTPUTS_BY_TYPE.missense;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Peptide Processor Help
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>How it works</Typography>
        <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
          The Peptide Processor takes genetic mutation data and applies it to the reference sequences.
          For this mutation type it generates:
        </Typography>
        <Box component="ul" sx={{ mb: 1 }}>
          {outputs.map((o) => (
            <li key={o.name}><Typography variant="body2"><strong>{o.name}:</strong> {o.desc}</Typography></li>
          ))}
        </Box>
        <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
          Lines that cannot be applied to the reference are rejected and listed with the reason in the results summary.
        </Typography>
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
