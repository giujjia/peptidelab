import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { JobsDrawerProvider } from './contexts/JobsDrawerContext';
import { AppRoutes } from './routes';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';



export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <JobsDrawerProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </JobsDrawerProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
