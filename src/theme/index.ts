import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    fontFamilyHero: string;
  }
  interface TypographyVariantsOptions {
    fontFamilyHero?: string;
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5248A2',
      light: '#eeedf8',
      dark: '#1a1540',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#cac8e9', // --primary-mid
      dark: '#8f8cc5',
    },
    success: {
      main: '#10b981',
    },
    error: {
      main: '#d32f2f', // MUI default
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontFamilyHero: '"IBM Plex Sans", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // Inherits shape.borderRadius
        },
        containedPrimary: {
          backgroundColor: '#5248A2',
          '&:hover': {
            backgroundColor: '#3d3680', // --primary-hover
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          // Inherits shape.borderRadius
        },
      },
    },
  },
});
