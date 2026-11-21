import React from 'react';
import { Dialog, DialogContent, Typography, IconButton, Box, Stack, Divider } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { overflow: 'hidden' } }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: 'primary.dark',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: 'secondary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'block',
            }}
          >
            Specification · {mutationType}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.3 }}>
            Peptide Processor Help
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'secondary.main' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={3}>
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Outputs
              </Typography>
            </Grid>
            <Grid xs={12} sm={9}>
              <Stack spacing={1.25}>
                {outputs.map((o) => (
                  <Typography key={o.name} variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    <Box component="strong" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                      {o.name}:
                    </Box>{' '}
                    {o.desc}
                  </Typography>
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
                  Lines that cannot be applied to the reference are rejected and listed with the reason in the results summary.
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Divider />

          <Grid container spacing={2}>
            <Grid xs={12} sm={3}>
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Format
              </Typography>
            </Grid>
            <Grid xs={12} sm={9}>
              <Stack spacing={1.25}>
                <Box
                  sx={{
                    bgcolor: 'background.default',
                    borderLeft: '2px solid',
                    borderColor: 'primary.main',
                    px: 2,
                    py: 1.25,
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: 'text.primary',
                    overflowX: 'auto',
                  }}
                >
                  {format}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Standard HGVS notation (e.g. <code>NP_000123.1:p.Arg175His</code> or <code>NM_000123.3:c.102del</code>). The optional <code>rsID</code> column can be provided before or after, separated by tab or space.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
