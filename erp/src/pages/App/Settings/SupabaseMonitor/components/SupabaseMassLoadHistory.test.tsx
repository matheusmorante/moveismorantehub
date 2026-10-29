// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/services/monitoring/massLoadHistoryService', () => ({
  getPendingMassLoadHistory: () => [],
  fetchMassLoadHistoryPage: () => Promise.resolve([{
    id: 'alert-a', user_id: 'user-a', occurred_at: '2026-10-29T00:00:00Z',
    title: 'Circuit Breaker Acionado', message: 'Repetição excessiva', level: 'CRITICAL', metric: null,
  }]),
}));
import { SupabaseMassLoadHistory } from './SupabaseMassLoadHistory';

describe('histórico do monitor', () => {
  afterEach(cleanup);
  it('mostra também alertas críticos de repetição', async () => {
    render(<SupabaseMassLoadHistory />);
    expect(await screen.findByText('Circuit Breaker Acionado')).toBeTruthy();
    expect(screen.getByText('Crítico')).toBeTruthy();
  });
});
