// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./hooks/useSupabaseTelemetry', () => ({
  useSupabaseTelemetry: () => ({
    isAdmin: true, loading: true, error: false, period: '1h',
    setPeriod: vi.fn(), resetDrillDown: vi.fn(),
  }),
}));
vi.mock('./components/SupabaseMassLoadHistory', () => ({
  SupabaseMassLoadHistory: () => <div>Histórico disponível</div>,
}));
import SupabaseMonitorDashboard from './Index';

describe('painel do Supabase', () => {
  afterEach(cleanup);
  it('mantém o histórico visível enquanto a telemetria carrega', () => {
    render(<SupabaseMonitorDashboard />);
    expect(screen.getByText('Histórico disponível')).toBeTruthy();
  });
});
