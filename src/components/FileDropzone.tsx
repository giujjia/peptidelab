import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileDropzoneProps {
  accept: string;
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  label?: string;
  hint?: string;
  multiple?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  onFileSelect,
  selectedFiles,
  label = 'Click to select or drag and drop',
  hint,
  multiple = true,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  // Arrastar ignora o accept do input, entao a extensao e conferida aqui nos dois caminhos
  const allowed = accept.split(',').map(ext => ext.trim().toLowerCase()).filter(Boolean);
  const handleFiles = (files: File[]) => {
    const valid = files.filter(f => allowed.some(ext => f.name.toLowerCase().endsWith(ext)));
    setRejected(files.filter(f => !valid.includes(f)).map(f => f.name));
    if (valid.length) onFileSelect(multiple ? valid : [valid[0]]);
  };

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
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
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(Array.from(e.target.files));
          // Permite escolher de novo o mesmo arquivo depois de uma recusa
          e.target.value = '';
        }}
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
      {rejected.length > 0 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          Not accepted: {rejected.join(', ')}. Allowed formats: {allowed.join(', ')}
        </Typography>
      )}
    </Box>
  );
};
