import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { api } from '../services/api';
import { errorMessage } from '../services/errors';
import { passwordLength, PASSWORD_MIN_LENGTH } from '../services/accountRules';

// Destino do link enviado por e-mail na recuperacao de senha
export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const shortPassword = password !== '' && passwordLength(password) < PASSWORD_MIN_LENGTH;
  const mismatch = confirm !== '' && confirm !== password;
  const ready = !!token && passwordLength(password) >= PASSWORD_MIN_LENGTH && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
    } catch (err: any) {
      setError(errorMessage(err, 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
      <Paper variant="outlined" sx={{ p: 5, maxWidth: 420, width: '100%', borderTop: '3px solid', borderColor: 'primary.main' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Set a new password</Typography>
        {!token ? (
          <Alert severity="error">This reset link is incomplete. Request a new one from the sign in page.</Alert>
        ) : done ? (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Password updated. For your security, every device signed in to this account was signed out.
            </Alert>
            <Button component={Link} to="/login" variant="contained" fullWidth>Go to sign in</Button>
          </>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              fullWidth type="password" label="New Password" margin="normal" size="small"
              value={password} onChange={(e) => setPassword(e.target.value)}
              error={shortPassword} helperText={`At least ${PASSWORD_MIN_LENGTH} characters`}
            />
            <TextField
              fullWidth type="password" label="Confirm New Password" margin="normal" size="small"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              error={mismatch} helperText={mismatch ? "Passwords don't match" : ' '}
            />
            <Button type="submit" variant="contained" fullWidth disabled={!ready} sx={{ mt: 2 }}>
              {loading ? 'Updating...' : 'Set New Password'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
