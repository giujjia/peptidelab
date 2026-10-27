// Textos da interface coerentes com o comportamento real (I32)
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpDialog } from '../src/components/processor/HelpDialog';
import { Layout } from '../src/components/Layout';
import { Dashboard } from '../src/pages/Dashboard';
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
    fireEvent.click(screen.getByText('Excluir Conta'));
    const texto = screen.getByText(/Sua conta será desativada imediatamente/).textContent || '';
    expect(texto).toContain('60 dias');
    expect(texto).toContain('reativada');
    expect(texto).not.toContain('30 dias');
  });

  it('dashboard descreve os tipos e recursos existentes', () => {
    render(<MemoryRouter><AuthProvider><Dashboard /></AuthProvider></MemoryRouter>);
    expect(screen.queryByText(/silent/i)).toBeNull();
    expect(screen.queryByText(/Column sorting/)).toBeNull();
    expect(screen.getByText(/stop-loss/)).toBeTruthy();
  });
});
