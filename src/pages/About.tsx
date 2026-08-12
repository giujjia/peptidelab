import React from 'react';
import { Box, Typography } from '@mui/material';

export const About: React.FC = () => {
  return (
    <Box sx={{ p: 4, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>About PeptideLab</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        PeptideLab is a proteogenomics platform developed at UNIR for generating custom FASTA databases,
        applying protein mutations, and tracing the relationship between genetic mutations and identified peptides.
      </Typography>
    </Box>
  );
};
