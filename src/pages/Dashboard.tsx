import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import LoginIcon from '@mui/icons-material/Login';
import { ToolCard } from '../components/common/ToolCard';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          bgcolor: 'primary.dark',
          pt: 8,
          pb: 7,
          px: 4,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: 20,
            width: 200,
            height: 200,
            borderRadius: "50%",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: "white",
              letterSpacing: "-.6px",
              mb: 2,
              maxWidth: 800,
            }}
          >
            Protein mutation{" "}
            <Box component="span" sx={{ color: "secondary.dark" }}>analysis platform</Box>
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "secondary.main",
              lineHeight: 1.6,
              maxWidth: 700,
              mb: 4,
            }}
          >
            Process missense, indel, stoploss and frameshift mutation data, visualize
            peptide tables and analyze protein sequences with precision.
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate('/processor')}
              sx={{
                px: 3,
                py: 1.5,
                fontFamily: (theme) => theme.typography.fontFamilyHero,
              }}
            >
              Start
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: (theme) => alpha(theme.palette.secondary.main, 0.4),
                color: "secondary.main",
                px: 3,
                py: 1.5,
                fontFamily: (theme) => theme.typography.fontFamilyHero,
                '&:hover': {
                  borderColor: (theme) => alpha(theme.palette.secondary.main, 0.8),
                  bgcolor: "rgba(255,255,255,0.05)"
                }
              }}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Box sx={{ bgcolor: 'background.default', py: 6, px: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-.3px", mb: 0.5 }}>
            Main Features
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            Two core tools for your proteomics workflow
          </Typography>
          
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <ToolCard
                title="Peptide Processor"
                desc="Process missense, indel, frameshift and silent mutations from text or file input"
                features={["Multiple mutation types", "Upload CSV/Excel files", "Reference protein database", "Download results"]}
                btnLabel="Access Tool"
                btnVariant="contained"
                accent="primary.main"
                onClick={() => navigate('/processor')}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <ToolCard
                title="Analysis Tool"
                desc="Visualize and filter tabular proteomics data interactively"
                features={["Multiple format support", "Advanced filters", "Column sorting", "Export filtered data"]}
                btnLabel="Open Analysis"
                btnVariant="outlined"
                accent="primary.light"
                onClick={() => navigate('/analysis')}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {!isAuthenticated && (
        <Box sx={{ pb: 8, px: 4 }}>
          <Container maxWidth="lg">
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 4, 
                bgcolor: 'primary.light', 
                border: '1px solid',
                borderColor: 'secondary.main',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                gap: 3,
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              <Box sx={{ width: 64, height: 64, bgcolor: 'white', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LoginIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Save your processing history</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to keep track of all your Peptide Processor jobs and access your previous results anytime.
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                onClick={() => navigate('/login')}
                sx={{ px: 4, py: 1 }}
              >
                Sign In Now
              </Button>
            </Paper>
          </Container>
        </Box>
      )}
    </Box>
  );
};
