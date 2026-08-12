import React from 'react';
import { Box, Typography, Pagination } from '@mui/material';

interface PaginationControlProps {
  page: number;
  totalPages: number;
  totalRows: number;
  onChange: (page: number) => void;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({ page, totalPages, totalRows, onChange }) => {
  if (totalRows === 0) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 3 }}>
      <Typography variant="caption" color="text.secondary">
        Page {page} of {totalPages} — {totalRows} rows total
      </Typography>
      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, p) => onChange(p)}
        size="small"
        color="primary"
      />
    </Box>
  );
};
