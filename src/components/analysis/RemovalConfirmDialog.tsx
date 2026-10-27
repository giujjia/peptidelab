import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';

export interface RemovalPreview {
  removed_count: number;
  remaining_count: number;
  sample_removed: string[];
}

interface RemovalConfirmDialogProps {
  open: boolean;
  description: string;
  preview: RemovalPreview | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// Filtros que removem linhas gravam a aba; o usuario ve o efeito antes de confirmar
export const RemovalConfirmDialog: React.FC<RemovalConfirmDialogProps> = ({ open, description, preview, onCancel, onConfirm }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontWeight: 700 }}>Remove rows permanently?</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 1 }}>{description}</Typography>
      {preview && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {preview.removed_count} row(s) will be removed and {preview.remaining_count} kept.
          </Typography>
          {preview.sample_removed.length > 0 && (
            <Box component="ul" sx={{ pl: 2, my: 1 }}>
              {preview.sample_removed.map((v, i) => (
                <li key={i}><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{v}</Typography></li>
              ))}
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            This changes the sheet on the server. Clear Search does not bring removed rows back.
          </Typography>
        </>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onCancel} color="inherit" sx={{ textTransform: 'none' }}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={!preview || preview.removed_count === 0} sx={{ textTransform: 'none' }}>
        Remove {preview?.removed_count ?? 0} row(s)
      </Button>
    </DialogActions>
  </Dialog>
);
