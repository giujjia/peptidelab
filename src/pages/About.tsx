import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Stack,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

const METHODOLOGY_ITEMS = [
  {
    title: '1. Database Generation',
    body: 'HGVS protein and transcript variants (missense, in-frame indels, frameshifts, nonsense, and stop-loss) are applied to RefSeq sequences and digested in silico with Trypsin/P (7–35 aa), preserving full peptide-level provenance.',
  },
  {
    title: '2. Spectral Cross-Validation',
    body: 'Imports tabular search results from compatible engines and compares reference (REF) and variant (VAR) assignments at the spectrum level using primary scores, matched peaks, mass error, and configurable thresholds.',
  },
  {
    title: '3. Biological Enrichment',
    body: 'Enriches datasets directly inside the workspace with RefSeq-to-UniProt mapping, gene symbol annotation, peptide provenance recovery, contaminant removal, numeric filtering, and Excel export.',
  },
  {
    title: '4. ESM-1v Scoring',
    body: 'Evaluates eligible missense variants with the ESM-1v protein language model by computing masked-marginal log-likelihood ratios (LLR) as a sequence-context prioritization metric, not as a clinical classification.',
  },
];

const REFERENCE_SPECS = [
  { label: 'Enzyme', value: 'Trypsin/P' },
  { label: 'Length', value: '7–35 aa' },
  { label: 'Model', value: 'ESM-1v' },
  { label: 'Method', value: 'dbPepVar' },
];

export const About: React.FC = () => {
  return (
    <Box sx={{ bgcolor: 'background.default', pb: 8 }}>
      {/* Compact Top Banner */}
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 3.5, px: 3 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
            spacing={1}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  color: 'secondary.main',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  display: 'block',
                }}
              >
                Documentation · Overview
              </Typography>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontFamily: (theme) => theme.typography.fontFamilyHero,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'white',
                  mt: 0.5,
                }}
              >
                PeptideLab
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'secondary.main' }}>
              UNIR · DACC · Proteogenomics
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Two-Column Swiss Scientific Layout */}
      <Container maxWidth="lg" sx={{ mt: 5 }}>
        <Grid container spacing={5}>
          {/* Left Index Rail */}
          <Grid xs={12} md={3}>
            <Stack spacing={4} sx={{ position: { md: 'sticky' }, top: { md: 72 } }}>
              <Stack spacing={1.25} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 2 }}>
                <Link href="#overview" underline="hover" variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Overview
                </Link>
                <Link href="#methodology" underline="hover" variant="body2" color="text.secondary">
                  Scientific Methodology
                </Link>
                <Link href="#team" underline="hover" variant="body2" color="text.secondary">
                  Research Team
                </Link>
                <Link href="#institution" underline="hover" variant="body2" color="text.secondary">
                  Institution
                </Link>
              </Stack>

              <Box sx={{ pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography
                  variant="caption"
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'text.secondary',
                    fontWeight: 700,
                    display: 'block',
                    mb: 1.5,
                  }}
                >
                  Reference Spec
                </Typography>
                <Stack spacing={1}>
                  {REFERENCE_SPECS.map((spec) => (
                    <Box key={spec.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {spec.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
                        {spec.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {/* Main Reading Column */}
          <Grid xs={12} md={9}>
            <Stack spacing={5}>
              <Box id="overview">
                <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8, fontSize: '1rem' }}>
                  PeptideLab is a web-based proteogenomics platform developed at the Federal University of Rondônia (UNIR). It integrates variant-derived search database generation, peptide-level provenance, post-search spectral cross-validation, biological annotation, and ESM-1v mutation-effect scoring in a single auditable environment.
                </Typography>
              </Box>

              <Divider />

              <Box id="methodology">
                <Typography
                  variant="overline"
                  component="h2"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    display: 'block',
                    mb: 2.5,
                  }}
                >
                  Scientific Methodology
                </Typography>

                <Grid container spacing={3.5}>
                  {METHODOLOGY_ITEMS.map((item) => (
                    <Grid key={item.title} xs={12} sm={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.75 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {item.body}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider />

              <Box id="team">
                <Typography
                  variant="overline"
                  component="h2"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    display: 'block',
                    mb: 1.5,
                  }}
                >
                  Research Team
                </Typography>

                <Stack divider={<Divider />} sx={{ borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box
                    sx={{
                      py: 2.25,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Dr. Lucas Marques da Cunha{' '}
                        <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                          · Project Advisor
                        </Box>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ph.D. in Bioinformatics, M.Sc. in Computer Science. Professor at UNIR.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2.5} sx={{ flexShrink: 0 }}>
                      <Link
                        href="http://lattes.cnpq.br/6545545471833974"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 500 }}
                      >
                        Lattes Curriculum
                      </Link>
                      <Link href="mailto:lucas.marques@unir.br" underline="hover" variant="body2" sx={{ fontWeight: 500 }}>
                        lucas.marques@unir.br
                      </Link>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      py: 2.25,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Giullia de Souza Santos{' '}
                        <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                          · Developer
                        </Box>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Undergraduate student in Computer Science at UNIR.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2.5} sx={{ flexShrink: 0 }}>
                      <Link
                        href="https://github.com/giujjia"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 500 }}
                      >
                        GitHub
                      </Link>
                      <Link
                        href="http://lattes.cnpq.br/9102911252852357"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 500 }}
                      >
                        Lattes
                      </Link>
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              <Box
                id="institution"
                sx={{
                  pt: 1,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'baseline' },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Federal University of Rondônia (UNIR)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Department of Computer Science (DACC) · Porto Velho, RO, Brazil
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2.5}>
                  <Link href="https://www.unir.br" target="_blank" rel="noopener noreferrer" underline="hover" variant="body2" sx={{ fontWeight: 500 }}>
                    unir.br
                  </Link>
                  <Link href="mailto:dacc@unir.br" underline="hover" variant="body2" sx={{ fontWeight: 500 }}>
                    dacc@unir.br
                  </Link>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
