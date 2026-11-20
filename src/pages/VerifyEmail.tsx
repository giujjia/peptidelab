import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Box, Paper, Typography, Button, CircularProgress, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { api } from '../services/api';
import { errorMessage } from '../services/errors';

// Um pedido por token, compartilhado entre montagens; o token e de uso unico no servidor
const verifications = new Map<string, Promise<void>>();

// Tokens ja confirmados neste navegador, para o link reaberto em outra aba ou depois de recarregar
const VERIFIED_KEY = 'peptidelab_verified_tokens';
const MAX_VERIFIED = 10;

const readVerified = (): string[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(VERIFIED_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const rememberVerified = (token: string) => {
  try {
    const tokens = [token, ...readVerified().filter(t => t !== token)].slice(0, MAX_VERIFIED);
    localStorage.setItem(VERIFIED_KEY, JSON.stringify(tokens));
  } catch {
    // Sem storage o link reaberto volta a depender do servidor
  }
};

export const verifyEmailToken = (token: string) => {
  if (readVerified().includes(token)) return Promise.resolve();
  let pending = verifications.get(token);
  if (!pending) {
    pending = api.post('/auth/verify-email', { token }).then(
      () => rememberVerified(token),
      (err) => {
        // So o sucesso fica guardado; falha passageira pode ser tentada de novo
        verifications.delete(token);
        throw err;
      },
    );
    verifications.set(token, pending);
  }
  return pending;
};

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const [token, setToken] = useState<string | null>(() => queryToken);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
      if (window.location.search.includes('token=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [queryToken]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Cada token comeca do zero e ignora respostas de tokens anteriores
    let current = true;
    setLoading(true);
    setSuccess(false);
    setErrorMsg('');

    if (!token) {
      setLoading(false);
      setErrorMsg('No verification token provided.');
      return;
    }

    verifyEmailToken(token)
      .then(() => {
        if (current) setSuccess(true);
      })
      .catch((err: any) => {
        if (current) setErrorMsg(errorMessage(err, 'Failed to verify email token.'));
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 96px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 5, maxWidth: 450, width: '100%', textAlign: 'center', borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ py: 4 }}>
            <CircularProgress color="primary" size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Verifying your email...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please wait while we validate your token.
            </Typography>
          </Box>
        ) : success ? (
          <Box sx={{ py: 2 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Email Verified!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Your account has been successfully verified. You can now log in to access PeptideLab.
            </Typography>
            <Button variant="contained" color="primary" component={Link} to="/login" fullWidth sx={{ py: 1.2 }}>
              Sign In to Your Account
            </Button>
          </Box>
        ) : (
          <Box sx={{ py: 2 }}>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {errorMsg}
            </Alert>
            <Button variant="outlined" color="primary" component={Link} to="/login" fullWidth sx={{ py: 1.2 }}>
              Back to Login
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
