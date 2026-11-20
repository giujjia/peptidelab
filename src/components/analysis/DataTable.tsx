import React from 'react';
import { Box, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Link } from '@mui/material';

interface DataTableProps {
  loading: boolean;
  columns: string[];
  data: Record<string, any>[];
}

const UNIPROT_ACCESSION = /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/;

const renderCellValue = (col: string, val: any) => {
  if (val === null || val === undefined) return '';
  const strVal = String(val).trim();
  
  if (strVal === 'Not Found' || strVal === 'N/A' || strVal === '') {
    return strVal;
  }

  // NCBI RefSeq Protein (e.g. NP_001354898.1)
  if (/^NP_\d+(\.\d+)?$/.test(strVal)) {
    return (
      <Link
        href={`https://www.ncbi.nlm.nih.gov/protein/${strVal}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
      >
        {strVal}
      </Link>
    );
  }

  // NCBI RefSeq Nucleotide (e.g. NM_000251.3)
  if (/^NM_\d+(\.\d+)?$/.test(strVal)) {
    return (
      <Link
        href={`https://www.ncbi.nlm.nih.gov/nuccore/${strVal}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
      >
        {strVal}
      </Link>
    );
  }

  // UniProtKB Accession (e.g. P04637 or A0A024RBG1); a celula pode listar varios separados por |
  const accessions = strVal.split('|').map(a => a.trim()).filter(Boolean);
  if (accessions.length > 0 && (col === 'UniProt_ID' || accessions.every(a => UNIPROT_ACCESSION.test(a)))) {
    return accessions.map((acc, i) => (
      <React.Fragment key={acc + i}>
        {i > 0 && ' | '}
        <Link
          href={`https://www.uniprot.org/uniprotkb/${encodeURIComponent(acc)}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: '#9c27b0', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
        >
          {acc}
        </Link>
      </React.Fragment>
    ));
  }

  return strVal;
};

export const DataTable: React.FC<DataTableProps> = ({ loading, columns, data }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', px: 3, pt: 1, pb: 0 }}>
      <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'primary.dark', color: 'white', fontSize: '12px', py: 1, borderBottom: 'none' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i} hover sx={{ '&:nth-of-type(even)': { bgcolor: 'background.default' } }}>
                  {columns.map(col => (
                    <TableCell key={col} sx={{ whiteSpace: 'nowrap', fontSize: '12px', py: 0.7, borderBottom: 1, borderColor: 'divider' }}>
                      {renderCellValue(col, row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
