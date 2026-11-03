import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  configurations: vi.fn(),
  moduleDefinition: vi.fn(),
}));

vi.mock('../../pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('./apiConfigService', () => ({ ApiConfigService: { getAllConfigurations: mocks.configurations } }));
vi.mock('./apiModuleMapper', () => ({ getModuleDefinition: mocks.moduleDefinition }));

import { getApiUsageDashboardMetrics } from './apiUsageDashboardService';

const configs = {
  google_routes: {
    service_id: 'google_routes', provider: 'google', service_name: 'Google Routes API',
    metric: 'requests', billing_unit: 'req', monthly_limit: 1000, warning_threshold: 70,
    critical_threshold: 90, hard_limit: 95, block_on_hard_limit: true,
    criticality: 'IMPORTANT', price_per_unit: 0.025, free_allowance: 500,
    currency: 'BRL', circuit_breaker_max_per_minute: 20, enabled: true,
  },
};

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({
    data: {
      daily: [{ service: 'google_routes', total_requests: 12, estimated_cost: 3, cache_hits: 2 }],
      details: [{ service: 'gemini_flash', provider: 'gemini', model: 'Resumo diário', module_source: 'legacy daily summary', total_requests: 4, total_units: 1200, estimated_cost: 0.4 }],
    },
    error: null,
  });
  mocks.configurations.mockReset().mockResolvedValue(configs);
  mocks.moduleDefinition.mockReset().mockImplementation((id: string) => ({ label: id, icon: 'bi-box', color: 'blue' }));
});
afterEach(() => vi.clearAllMocks());

describe('métricas do cartão de APIs', () => {
  it('usa apenas a resposta agregada do servidor para os indicadores e detalhes', async () => {
    const result = await getApiUsageDashboardMetrics('2026-11-01', '2026-11-30', 'all');

    expect(mocks.rpc).toHaveBeenCalledWith('get_api_usage_dashboard_aggregates', {
      p_start_date: '2026-11-01', p_end_date: '2026-11-30', p_environment: 'all',
    });
    expect(result.totalRequests).toBe(12);
    expect(result.totalCostBrl).toBe(3);
    expect(result.summaries[0]).toMatchObject({ currentMonthUsage: 12, cacheHits: 2 });
    expect(result.totalAiTokens).toBe(1200);
    expect(result.modelsBreakdown[0].totalRequests).toBe(4);
  });

  it('propaga erro em vez de converter a falha em zero', async () => {
    const error = new Error('sem permissão');
    mocks.rpc.mockResolvedValue({ data: null, error });

    await expect(getApiUsageDashboardMetrics('2026-11-01', '2026-11-30')).rejects.toBe(error);
  });
});
