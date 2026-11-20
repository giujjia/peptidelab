import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { notify, apiMock } = vi.hoisted(() => ({
  notify: vi.fn(),
  apiMock: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../src/contexts/NotificationContext', () => ({ useNotification: () => ({ notify }) }));
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({ isLoading: false, user: null, session: null, clearLocalSession: vi.fn() }),
}));
vi.mock('../src/services/api', () => ({ api: apiMock, setAuthToken: vi.fn(), getAuthToken: () => null }));

import { AnalysisTool } from '../src/pages/AnalysisTool';
import { ResetPassword } from '../src/pages/ResetPassword';

beforeEach(() => {
  notify.mockReset();
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  apiMock.delete.mockReset();
  apiMock.get.mockResolvedValue({ data: { esm: true, esm_max_rows: 200 } });
  window.history.replaceState(null, '', '/');
});

describe('C23 frontend security fixes', () => {
  it('blocks path traversal session_id from query string', async () => {
    window.history.replaceState(null, '', '/analysis?session_id=..%2F..%2Fjobs%2F');
    render(<AnalysisTool />);
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Invalid session link', 'error'));
    const sessionCalls = apiMock.get.mock.calls.filter(c => String(c[0]).startsWith('/analysis/session/'));
    expect(sessionCalls).toHaveLength(0);
    expect(window.location.search).toBe('');
  });

  it('strips token query param from URL on ResetPassword', async () => {
    window.history.replaceState(null, '', '/reset-password?token=secret-tok');
    render(
      <MemoryRouter initialEntries={['/reset-password?token=secret-tok']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(screen.getByText('Set a new password')).toBeTruthy();
  });
});
