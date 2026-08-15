import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Typography, Paper, Alert, Link as MuiLink } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerAccount } = useAuth();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const [successMsg, setSuccessMsg] = useState('');

  const onSubmit = async (data: RegisterFormInputs) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await registerAccount(data.email, data.password);
      if (res && res.is_verified === false) {
        setSuccessMsg('Conta criada com sucesso! Um e-mail de verificação foi enviado para o seu endereço. Por favor, confirme seu e-mail para acessar.');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred during registration');
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
            <img src="/img/peptidelab.png" alt="PeptideLab" style={{ width: 48, height: 48 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Create an Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Join PeptideLab for advanced analysis
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {successMsg && <Alert severity="info" sx={{ mb: 2 }}>{successMsg}</Alert>}
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
          <TextField
            fullWidth
            type="password"
            label="Confirm Password"
            margin="normal"
            size="small"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              py: 1.2,
              fontSize: '15px',
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login" sx={{ fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
