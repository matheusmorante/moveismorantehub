import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../../pages/utils/supabaseConfig', () => ({
  supabase: supabaseMocks,
  ecommerceSupabase: {},
}));

import { ApiUsageTracker } from '../apiUsageTracker';

const createQuery = (result: unknown) => {
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.lte = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
};

describe('ApiUsageTracker.getCurrentMonthUsage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca o total em uma única RPC e retorna número', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: '1642.5', error: null });

    const usage = await ApiUsageTracker.getCurrentMonthUsage('meta_whatsapp', 'production');

    expect(usage).toBe(1642.5);
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('get_api_usage_monthly_total', {
      p_service: 'meta_whatsapp',
      p_start_date: '2026-11-01',
      p_end_date: '2026-11-30',
      p_environment: 'production',
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('mantém o caminho anterior se a RPC falhar', async () => {
    const dailyQuery = createQuery({ data: [{ total_requests: 0 }], error: null });
    const logsQuery = createQuery({ data: [{ units: 1 }, { units: 2.5 }], error: null });
    supabaseMocks.rpc.mockResolvedValue({ data: null, error: { message: 'RPC indisponível' } });
    supabaseMocks.from.mockImplementation((table: string) =>
      table === 'api_usage_daily' ? dailyQuery : logsQuery
    );

    const usage = await ApiUsageTracker.getCurrentMonthUsage('meta_whatsapp', 'production');

    expect(usage).toBe(3.5);
    expect(supabaseMocks.from).toHaveBeenNthCalledWith(1, 'api_usage_daily');
    expect(supabaseMocks.from).toHaveBeenNthCalledWith(2, 'api_usage_logs');
    expect(dailyQuery.select).toHaveBeenCalledWith('total_requests');
    expect(logsQuery.select).toHaveBeenCalledWith('units');
    expect(logsQuery.eq).toHaveBeenCalledWith('environment', 'production');
  });
});
