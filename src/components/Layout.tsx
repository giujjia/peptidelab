import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Divider,
  Link,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, deleteAccount } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useNotification();

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleCloseMenu();
    const { revoked } = await logout();
    if (!revoked) {
      notify('Signed out on this device, but the server could not confirm the session was revoked. It stays valid until it expires.', 'warning');
    }
    navigate('/login');
  };

  const handleOpenDelete = () => {
    handleCloseMenu();
    setConfirmDeleteOpen(true);
  };

  const navItems = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Peptide Processor', path: '/processor' },
    { label: 'Analysis Tool', path: '/analysis' },
    { label: 'About', path: '/about' },
  ];

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

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
              gap: '10px',
              cursor: 'pointer'
            }}
          >
            <img
              src="/img/peptidelab.png"
              alt="PeptideLab Logo"
              style={{
                padding: '1px',
                width: 34,
                height: 34,
                objectFit: 'contain'
              }}
            />
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
              <>
                <IconButton
                  onClick={handleOpenMenu}
                  sx={{
                    p: 0.5,
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                  title={user?.email || 'Minha Conta'}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '14px', fontWeight: 600 }}>
                    {userInitial}
                  </Avatar>
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      mt: 1,
                      minWidth: 180,
                      borderRadius: 2,
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  {user?.email && (
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Conectado como
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                        {user.email}
                      </Typography>
                    </Box>
                  )}
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sair (Logout)" />
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleOpenDelete} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                      <DeleteForeverIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="Excluir Conta" />
                  </MenuItem>
                </Menu>
              </>
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

      {/* Confirmation Modal for Account Deletion */}
      <Dialog open={confirmDeleteOpen} onClose={() => !deleting && setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Confirmar Exclusão de Conta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sua conta será desativada imediatamente. Se você entrar de novo em até <strong>60 dias</strong>, ela é reativada. Depois desse prazo, a conta, os jobs, as tarefas de análise e os registros de e-mail ligados a ela são <strong>apagados definitivamente</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} color="inherit" disabled={deleting} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              setDeleting(true);
              try {
                await deleteAccount();
                setConfirmDeleteOpen(false);
                notify('Conta desativada.', 'success');
                navigate('/login');
              } catch (err: any) {
                // Dialogo continua aberto: a conta segue ativa
                notify(err?.response?.data?.detail || 'Não foi possível confirmar a desativação. Sua conta continua ativa.', 'error');
              } finally {
                setDeleting(false);
              }
            }}
            color="error"
            variant="contained"
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            {deleting ? 'Excluindo...' : 'Sim, Excluir Minha Conta'}
          </Button>
        </DialogActions>
      </Dialog>
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
