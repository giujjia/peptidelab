import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileDropzoneProps {
  accept: string;
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  label?: string;
  hint?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  onFileSelect,
  selectedFiles,
  label = 'Click to select or drag and drop',
  hint,
}) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) onFileSelect(Array.from(e.dataTransfer.files));
      }}
      component="label"
      sx={{
        display: 'block',
        border: 1.5,
        borderStyle: 'dashed',
        borderColor: dragOver ? 'primary.main' : 'divider',
        borderRadius: 1,
        p: 4,
        textAlign: 'center',
        bgcolor: dragOver ? 'primary.light' : 'background.default',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      <input
        type="file"
        hidden
        accept={accept}
        multiple
        onChange={(e) => e.target.files?.length && onFileSelect(Array.from(e.target.files))}
      />
      <Box sx={{ width: 48, height: 48, bgcolor: 'primary.light', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
        <CloudUploadIcon sx={{ color: 'primary.main', fontSize: 24 }} />
      </Box>
      {selectedFiles.length > 0 ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
          </Typography>
          {selectedFiles.length <= 3 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {selectedFiles.map(f => f.name).join(', ')}
            </Typography>
          )}
        </Box>
      ) : (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
          {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
        </>
      )}
    </Box>
  );
};
