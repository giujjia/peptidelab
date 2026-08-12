import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { SheetInfo } from '../../types';

interface SheetTabsProps {
  sheetsInfo: Record<string, SheetInfo>;
  activeSheet: string;
  onChange: (sheet: string) => void;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({ sheetsInfo, activeSheet, onChange }) => {
  return (
    <Box sx={{ px: 3 }}>
      <Tabs
        value={activeSheet}
        onChange={(_, v) => onChange(v)}
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '13px' }
        }}
      >
        {Object.keys(sheetsInfo).map(name => (
          <Tab key={name} label={name.charAt(0).toUpperCase() + name.slice(1)} value={name} />
        ))}
      </Tabs>
    </Box>
  );
};
