// Textos da interface coerentes com o comportamento real (I32)
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpDialog } from '../src/components/processor/HelpDialog';
import { Layout } from '../src/components/Layout';
import { Dashboard } from '../src/pages/Dashboard';
import { About } from '../src/pages/About';
import { EsmPopover } from '../src/components/analysis/EsmPopover';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { jwt } from './helpers';

beforeEach(() => {
  localStorage.clear();
});

describe('ajuda do Processor', () => {
  it('frameshift lista inframe e ext, e nao as saidas do missense', () => {
    render(<HelpDialog open onClose={() => {}} format="x" mutationType="frameshift" />);
    expect(screen.getByText('inframe:')).toBeTruthy();
    expect(screen.getByText('ext:')).toBeTruthy();
    expect(screen.queryByText('dbfinal:')).toBeNull();
  });

  it('stop-loss nao promete dbfinal', () => {
    render(<HelpDialog open onClose={() => {}} format="x" mutationType="stoploss" />);
    expect(screen.getByText('dbpepmutref:')).toBeTruthy();
    expect(screen.queryByText('dbfinal:')).toBeNull();
  });
});

describe('textos de conta e de apresentacao', () => {
  it('exclusao de conta informa 60 dias e reativacao', () => {
    localStorage.setItem('peptidelab_token', jwt('a'));
    localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'a', email: 'a@x.org' }));
    render(
      <MemoryRouter>
        <NotificationProvider><AuthProvider><Layout /></AuthProvider></NotificationProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTitle('a@x.org'));
    expect(screen.getByText('Signed in as')).toBeTruthy();
    expect(screen.getByText('Sign Out')).toBeTruthy();
    fireEvent.click(screen.getByText('Delete Account'));
    const text = screen.getByText(/Your account will be deactivated immediately/).textContent || '';
    expect(text).toContain('60 days');
    expect(text).toContain('reactivated');
    expect(text).not.toContain('30 days');
  });

  it('dashboard descreve os tipos e recursos existentes', () => {
    render(<MemoryRouter><AuthProvider><Dashboard /></AuthProvider></MemoryRouter>);
    expect(screen.queryByText(/silent/i)).toBeNull();
    expect(screen.queryByText(/Column sorting/)).toBeNull();
    expect(screen.getByText(/stop-loss/)).toBeTruthy();
  });

  it('about page lists advisor lattes and final contact emails', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('http://lattes.cnpq.br/6545545471833974');
    expect(hrefs).toContain('mailto:lucas.marques@unir.br');
    expect(hrefs).toContain('mailto:dacc@unir.br');
    expect(hrefs).not.toContain('http://lattes.cnpq.br/');
    expect(hrefs).not.toContain('mailto:unir@unir.br');
  });

  it('esm email notification label is in English', () => {
    localStorage.setItem('peptidelab_token', jwt('a'));
    localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'a', email: 'a@x.org' }));
    const anchor = document.createElement('div');
    document.body.appendChild(anchor);
    render(
      <MemoryRouter>
        <AuthProvider>
          <EsmPopover
            anchorEl={anchor}
            onClose={() => {}}
            columns={['Sequence', 'Position', 'Old', 'New']}
            onConfirm={() => {}}
            totalRows={5}
          />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Notify me by email when the analysis finishes')).toBeTruthy();
    anchor.remove();
  });

  it('esm popover blocks guests even for small datasets', () => {
    const anchor = document.createElement('div');
    document.body.appendChild(anchor);
    render(
      <MemoryRouter>
        <AuthProvider>
          <EsmPopover
            anchorEl={anchor}
            onClose={() => {}}
            columns={['Sequence', 'Position', 'Old', 'New']}
            onConfirm={() => {}}
            totalRows={3}
          />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/available to registered users only/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in to Run' })).toHaveProperty('disabled', true);
    anchor.remove();
  });

  it('esm popover blocks authenticated users above maxRows', () => {
    localStorage.setItem('peptidelab_token', jwt('a'));
    localStorage.setItem('peptidelab_user', JSON.stringify({ id: 'a', email: 'a@x.org' }));
    const anchor = document.createElement('div');
    document.body.appendChild(anchor);
    render(
      <MemoryRouter>
        <AuthProvider>
          <EsmPopover
            anchorEl={anchor}
            onClose={() => {}}
            columns={['Sequence', 'Position', 'Old', 'New']}
            onConfirm={() => {}}
            totalRows={250}
            maxRows={200}
          />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/limited to 200 rows per run/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Limit: 200 Rows' })).toHaveProperty('disabled', true);
    anchor.remove();
  });
});
