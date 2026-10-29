// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAdmin: true }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));

import { useSupabaseTelemetry } from './useSupabaseTelemetry';

describe('consulta de telemetria', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); mocks.rpc.mockReset(); });

  it('libera a tela quando o banco não responde', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.rpc.mockReturnValue({ abortSignal: () => new Promise(() => {}) });
    const { result } = renderHook(() => useSupabaseTelemetry());
    expect(result.current.loading).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(true);
  });

  it('não calcula média de linhas quando existem respostas sem contagem', async () => {
    mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({
      data: [{ module: 'ERP', screen: '/products', action: 'GET attributes', table_name: 'attributes',
        operation_type: 'SELECT', execution_count: 3, rows_returned: 999, unknown_rows_count: 1,
        total_duration_ms: 30, response_bytes: 1024, measured_response_count: 1 },
      { module: 'ERP', screen: '/products', action: 'GET attributes', table_name: 'attributes',
        operation_type: 'SELECT', execution_count: 0, rows_returned: 0, unknown_rows_count: 0,
        total_duration_ms: 0, response_bytes: 128, measured_response_count: 1 }],
      error: null,
    }) });
    const { result } = renderHook(() => useSupabaseTelemetry());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drillDownView[0].avgRows).toBeNull();
    expect(result.current.drillDownView[0].unknownRowsCount).toBe(1);
    expect(result.current.globalStats.totalReqs).toBe(3);
    expect(result.current.globalStats.measuredResponses).toBe(2);
  });
});
