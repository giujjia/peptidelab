import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Typography, Paper, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { errorMessage } from '../services/errors';
import { emailSchema, normalizeEmail, passwordLength, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, EMAIL_MAX_LENGTH, EMAIL_PATTERN } from '../services/accountRules';

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
  const { login, clearLocalSession } = useAuth();
  const [error, setError] = useState('');

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  // Cada abertura do dialogo e um fluxo; callbacks de fluxos anteriores sao ignorados
  const forgotFlowRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => clearCloseTimer, []);

  const openForgot = () => {
    clearCloseTimer();
    forgotFlowRef.current += 1;
    setForgotOpen(true);
    setResetStep(1);
    setForgotMsg(null);
    setForgotLoading(false);
  };

  const closeForgot = () => {
    clearCloseTimer();
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

  const handleRequestReset = async () => {
    if (!forgotEmail) return;
    const flow = forgotFlowRef.current;
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      await api.post('/auth/forgot-password', { email: normalizeEmail(forgotEmail) });
      if (flow !== forgotFlowRef.current) return;
      setResetStep(2);
      setForgotMsg({ text: 'If an account exists, we sent a reset link to this email. Open the link, or paste the code from it below.', type: 'success' });
    } catch (err: any) {
      if (flow !== forgotFlowRef.current) return;
      setForgotMsg({ text: errorMessage(err, 'Failed to request password reset'), type: 'error' });
    } finally {
      if (flow === forgotFlowRef.current) setForgotLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetToken || !newPassword) return;
    const flow = forgotFlowRef.current;
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      await api.post('/auth/reset-password', { token: resetToken, new_password: newPassword });
      clearLocalSession();
      if (flow !== forgotFlowRef.current) return;
      setForgotMsg({ text: 'Password reset successfully! You can now log in.', type: 'success' });
      clearCloseTimer();
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        if (flow !== forgotFlowRef.current) return;
        closeForgot();
        setResetStep(1);
        setForgotEmail('');
        setResetToken('');
        setNewPassword('');
        setForgotMsg(null);
      }, 1500);
    } catch (err: any) {
      if (flow !== forgotFlowRef.current) return;
      setForgotMsg({ text: errorMessage(err, 'Failed to reset password'), type: 'error' });
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
        <DialogContent>
          {forgotMsg && <Alert severity={forgotMsg.type} sx={{ mb: 2 }}>{forgotMsg.text}</Alert>}

          {resetStep === 1 ? (
            <TextField
              fullWidth
              label="Account Email Address"
              margin="dense"
              size="small"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
          ) : (
            <>
              <TextField
                fullWidth
                label="Reset Token Code"
                margin="dense"
                size="small"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                margin="dense"
                size="small"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={newPassword !== '' && (passwordLength(newPassword) < PASSWORD_MIN_LENGTH || passwordLength(newPassword) > PASSWORD_MAX_LENGTH)}
                helperText={`${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForgot} color="inherit" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          {resetStep === 1 ? (
            <Button
              variant="contained"
              onClick={handleRequestReset}
              disabled={forgotLoading || normalizeEmail(forgotEmail).length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(normalizeEmail(forgotEmail))}
              sx={{ textTransform: 'none' }}
            >
              {forgotLoading ? 'Requesting...' : 'Next'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleConfirmReset}
              disabled={forgotLoading || !resetToken || passwordLength(newPassword) < PASSWORD_MIN_LENGTH || passwordLength(newPassword) > PASSWORD_MAX_LENGTH}
              sx={{ textTransform: 'none' }}
            >
              {forgotLoading ? 'Updating...' : 'Set New Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
