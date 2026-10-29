// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  start: vi.fn(() => vi.fn()),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/services/monitoring/massLoadHistoryService', () => ({
  recordSupabaseAnomaly: mocks.record,
  startMassLoadHistorySync: mocks.start,
}));
import { SupabaseHistoryRecorder } from './SupabaseHistoryRecorder';

describe('registro global de alertas', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('registra alertas da sessão sem depender de perfil administrativo ou do layout', () => {
    render(<SupabaseHistoryRecorder />);
    const detail = { title: 'Circuit Breaker Acionado', message: 'Repetição', level: 'CRITICAL' };
    act(() => window.dispatchEvent(new CustomEvent('SUPABASE_ANOMALY', { detail })));
    expect(mocks.record).toHaveBeenCalledWith(detail, 'user-a');
    expect(mocks.start).toHaveBeenCalledWith('user-a');
  });
});
