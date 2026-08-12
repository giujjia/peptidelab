import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppBar, Toolbar, Typography, Button, Box, Divider, Link } from '@mui/material';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const navItems = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Peptide Processor', path: '/processor' },
    { label: 'Analysis Tool', path: '/analysis' },
    { label: 'About', path: '/about' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ bgcolor: 'primary.dark', boxShadow: 'none' }}>
        <Toolbar variant="dense">
          <Box
            onClick={() => navigate('/dashboard')}
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer'
            }}
          >
            <img src="/img/favicon.ico" alt="PeptideLab Logo" style={{ width: 24, height: 24 }} />
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '.4px',
              }}
            >
              PeptideLab
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive ? 'white' : 'secondary.dark',
                    bgcolor: isActive ? 'rgba(255,255,255,.1)' : 'transparent',
                    textTransform: 'none',
                    fontWeight: isActive ? 600 : 400,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,.15)'
                    }
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
            <Divider orientation="vertical" variant="middle" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
            {isAuthenticated ? (
              <Button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                sx={{ color: 'secondary.dark', textTransform: 'none' }}
              >
                Logout
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                sx={{ color: 'white', textTransform: 'none', fontWeight: 600 }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      <Box component="footer" sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        bgcolor: 'primary.dark',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Typography variant="body2">
          © 2026 <Link href="https://www.unir.br" target="_blank" rel="noreferrer" sx={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>UNIR</Link> — All Rights Reserved
        </Typography>
      </Box>
    </Box>
  );
};
