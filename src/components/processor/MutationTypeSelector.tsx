import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { mutationTypes } from './constants';

interface MutationTypeSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export const MutationTypeSelector: React.FC<MutationTypeSelectorProps> = ({ value, onChange }) => {
  const current = mutationTypes.find(m => m.id === value) || mutationTypes[0];

  return (
    <>
      <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: ".1em", display: 'block', mb: 1 }}>
        Mutation type
      </Typography>
      
      <Box sx={{ display: "flex", border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: "hidden", mb: 3 }}>
        {mutationTypes.map((m) => (
          <Button
            key={m.id}
            onClick={() => onChange(m.id)}
            sx={{
              flex: 1,
              bgcolor: value === m.id ? 'primary.main' : "white",
              color: value === m.id ? "white" : 'text.secondary',
              borderRadius: 0,
              textTransform: 'none',
              py: 1,
              fontWeight: value === m.id ? 600 : 500,
              '&:hover': { bgcolor: value === m.id ? 'primary.dark' : 'grey.50' }
            }}
          >
            {m.label}
          </Button>
        ))}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Chip 
          label={current.id} 
          size="small" 
          sx={{ 
            bgcolor: 'primary.light', 
            color: 'primary.main', 
            fontWeight: 600, 
            borderRadius: 1,
            border: 1,
            borderColor: 'divider'
          }} 
        />
        <Typography variant="body2" color="text.secondary">{current.description}</Typography>
      </Box>
    </>
  );
};
