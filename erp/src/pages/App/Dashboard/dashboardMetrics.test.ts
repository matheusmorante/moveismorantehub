import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));
import { dashboardMetricsSchema, EMPTY_DASHBOARD_METRICS, fetchDashboardMetrics, type DashboardMetricsRange } from './dashboardMetrics';
const range: DashboardMetricsRange = {
  currentStart: new Date('2026-11-01T03:00:00Z'), currentEnd: new Date('2026-11-04T23:59:59Z'),
  previousStart: new Date('2026-10-01T03:00:00Z'), previousEnd: new Date('2026-10-04T23:59:59Z'),
  bucket: 'day', timezone: 'America/Sao_Paulo',
};
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('contrato agregado do Dashboard', () => {
  it('faz uma única RPC cancelável com limites e fuso completos', async () => {
    mocks.rpc.mockReturnValue({ abortSignal: mocks.abortSignal });
    mocks.abortSignal.mockResolvedValue({ data: EMPTY_DASHBOARD_METRICS, error: null });
    const signal = new AbortController().signal;
    expect(await fetchDashboardMetrics(range, signal)).toEqual(EMPTY_DASHBOARD_METRICS);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('get_dashboard_metrics', {
      p_current_start: range.currentStart.toISOString(), p_current_end: range.currentEnd.toISOString(),
      p_previous_start: range.previousStart.toISOString(), p_previous_end: range.previousEnd.toISOString(),
      p_bucket: 'day', p_timezone: 'America/Sao_Paulo',
    });
    expect(mocks.abortSignal).toHaveBeenCalledWith(signal);
  });
  it('recusa uma resposta incompleta em vez de mostrar zeros como sucesso', () => {
    expect(() => dashboardMetricsSchema.parse({ current: {} })).toThrow();
    expect(() => dashboardMetricsSchema.parse({ ...EMPTY_DASHBOARD_METRICS, current: { ...EMPTY_DASHBOARD_METRICS.current, totalCmv: NaN } })).toThrow();
  });
  it('encerra o carregamento quando o serviço não responde', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockReturnValue({ abortSignal: mocks.abortSignal });
    mocks.abortSignal.mockReturnValue(new Promise(() => {}));
    const result = expect(fetchDashboardMetrics(range, new AbortController().signal)).rejects.toThrow('tempo limite');
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
  });
});
