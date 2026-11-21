import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Typography, Paper, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { errorMessage } from '../services/errors';
import { emailSchema, normalizeEmail, passwordLength, PASSWORD_MAX_LENGTH, EMAIL_MAX_LENGTH, EMAIL_PATTERN } from '../services/accountRules';

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .refine((v) => passwordLength(v) <= PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  // Cada abertura do dialogo e um fluxo; callbacks de fluxos anteriores sao ignorados
  const forgotFlowRef = useRef(0);

  const openForgot = () => {
    forgotFlowRef.current += 1;
    setForgotOpen(true);
    setForgotSent(false);
    setForgotError('');
    setForgotLoading(false);
  };

  const closeForgot = () => {
    forgotFlowRef.current += 1;
    setForgotOpen(false);
    setForgotLoading(false);
  };

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(errorMessage(err, 'An error occurred during login'));
    }
  };

  const handleRequestReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const email = normalizeEmail(forgotEmail);
    if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) return;
    const flow = forgotFlowRef.current;
    setForgotLoading(true);
    setForgotError('');
    try {
      await api.post('/auth/forgot-password', { email });
      if (flow !== forgotFlowRef.current) return;
      setForgotSent(true);
    } catch (err: any) {
      if (flow !== forgotFlowRef.current) return;
      setForgotError(errorMessage(err, 'Failed to request password reset'));
    } finally {
      if (flow === forgotFlowRef.current) setForgotLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 96px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      px: 2,
    }}>
      <Paper variant="outlined" sx={{ p: 5, maxWidth: 420, width: '100%', borderTop: '3px solid', borderColor: 'primary.main' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ width: 48, height: 48, mx: 'auto', mb: 2 }}>
            <img src="/img/peptidelab.png" alt="PeptideLab" style={{ width: 50, height: 50 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sign in to access PeptideLab
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth
            label="Email Address"
            margin="normal"
            size="small"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            margin="normal"
            size="small"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          
          <Box sx={{ textAlign: 'right', mt: 0.5 }}>
            <Button
              variant="text"
              size="small"
              onClick={openForgot}
              sx={{ textTransform: 'none', fontSize: '12px', p: 0 }}
            >
              Forgot password?
            </Button>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              mb: 2,
              py: 1.2,
              fontSize: '15px',
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#0288D1', fontWeight: 600, textDecoration: 'none' }}>
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onClose={closeForgot} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Reset Password</DialogTitle>
        <Box component="form" onSubmit={handleRequestReset}>
          <DialogContent sx={{ pt: 1 }}>
            {forgotError && <Alert severity="error" sx={{ mb: 2 }}>{forgotError}</Alert>}

            {forgotSent ? (
              <Alert severity="success">
                If an account exists for <strong>{normalizeEmail(forgotEmail)}</strong>, we sent a password reset link. Check your inbox and open the link to set a new password.
              </Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  Enter your account email and we will send you a link to set a new password.
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  label="Account Email Address"
                  margin="dense"
                  size="small"
                  autoFocus
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {forgotSent ? (
              <Button variant="contained" onClick={closeForgot} sx={{ textTransform: 'none' }}>
                Close
              </Button>
            ) : (
              <>
                <Button onClick={closeForgot} color="inherit" sx={{ textTransform: 'none' }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={forgotLoading || normalizeEmail(forgotEmail).length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(normalizeEmail(forgotEmail))}
                  sx={{ textTransform: 'none' }}
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
