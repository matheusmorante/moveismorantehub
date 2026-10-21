import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

import { AiGateway } from '../AiGateway';
import { AiConcurrencyLimiter } from '../core/AiConcurrencyLimiter';
import { AiCircuitBreaker } from '../core/AiCircuitBreaker';
import { AiDeduplicator } from '../core/AiDeduplicator';
import { AiQuotaManager } from '../core/AiQuotaManager';

describe('AiGateway - Camada Global de Proteção de IA', () => {
  beforeEach(() => {
    AiConcurrencyLimiter.reset();
    AiCircuitBreaker.resetGlobal();
    AiCircuitBreaker.resetCategory('TEXT');
    AiCircuitBreaker.resetCategory('IMAGE');
    AiDeduplicator.clear();
    vi.restoreAllMocks();
  });

  it('deve rejeitar concorrência de texto acima de 3 chamadas simultâneas', async () => {
    // Mockar reserveQuota para simular cota liberada
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({ allowed: true });

    // Bloquear chamadas de rede reais
    vi.spyOn(AiGateway as any, 'callGeminiApiProxied').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('OK'), 200))
    );

    // Disparar 4 requisições paralelas
    const req1 = AiGateway.requestText({
      operation: 'op1',
      payload: 'p1',
      bypassDeduplication: true,
    });
    const req2 = AiGateway.requestText({
      operation: 'op2',
      payload: 'p2',
      bypassDeduplication: true,
    });
    const req3 = AiGateway.requestText({
      operation: 'op3',
      payload: 'p3',
      bypassDeduplication: true,
    });
    const req4 = AiGateway.requestText({
      operation: 'op4',
      payload: 'p4',
      bypassDeduplication: true,
    });

    const results = await Promise.all([req1, req2, req3, req4]);
    const blockedCount = results.filter(
      (r) => r.errorCode === 'AI_CONCURRENCY_LIMIT_REACHED'
    ).length;

    expect(blockedCount).toBeGreaterThanOrEqual(1);
  });

  it('deve aplicar o princípio Fail Closed em caso de falha de comunicação do limiter', async () => {
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({
      allowed: false,
      errorCode: 'AI_FAIL_CLOSED_BLOCKED',
      errorMessage: 'FAIL CLOSED: Erro de banco de dados.',
    });

    const res = await AiGateway.requestText({ operation: 'test_fail_closed', payload: 'test' });
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('AI_FAIL_CLOSED_BLOCKED');
  });

  it('deve deduplicar solicitações idênticas disparadas quase simultaneamente', async () => {
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({ allowed: true });
    let apiCallCount = 0;
    vi.spyOn(AiGateway as any, 'callGeminiApiProxied').mockImplementation(async () => {
      apiCallCount++;
      return 'Deduplicated Response';
    });

    const payload = { prompt: 'Descrição do produto sofa' };
    const p1 = AiGateway.requestText({ operation: 'generate_desc', payload });
    const p2 = AiGateway.requestText({ operation: 'generate_desc', payload });

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.data).toBe('Deduplicated Response');
    expect(res2.data).toBe('Deduplicated Response');
    expect(apiCallCount).toBe(1); // APENAS 1 CHAMADA REAL Á API
  });

  it('deve permitir uma nova chamada explícita após a chamada anterior terminar', async () => {
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({ allowed: true });
    let apiCallCount = 0;
    vi.spyOn(AiGateway as any, 'callGeminiApiProxied').mockImplementation(async () => {
      apiCallCount++;
      return 'Resposta';
    });

    const request = { operation: 'generate_desc', payload: { prompt: 'Guarda-roupa' } };
    await AiGateway.requestText(request);
    await AiGateway.requestText(request);

    expect(apiCallCount).toBe(2);
  });

  it('deve limitar a uma chamada simultânea para extração de características, mesmo com payloads distintos', async () => {
    vi.spyOn(AiQuotaManager, 'reserveCharacteristicsQuota').mockResolvedValue({ allowed: true });
    let resolveFirstRequest!: (value: string) => void;
    const firstApiCall = new Promise<string>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const apiCall = vi
      .spyOn(AiGateway as any, 'callGeminiApiProxied')
      .mockImplementation(() => firstApiCall);

    const first = AiGateway.requestText({
      operation: 'catalog_extract_technical_specs',
      payload: { product: 'A' },
    });
    const second = await AiGateway.requestText({
      operation: 'catalog_extract_technical_specs',
      payload: { product: 'B' },
    });

    expect(second.success).toBe(false);
    expect(second.errorCode).toBe('AI_CONCURRENCY_LIMIT_REACHED');
    expect(apiCall).toHaveBeenCalledTimes(1);

    resolveFirstRequest('OK');
    await first;
  });

  it('não deve chamar o Gemini quando a cota de características bloquear a requisição', async () => {
    vi.spyOn(AiQuotaManager, 'reserveCharacteristicsQuota').mockResolvedValue({
      allowed: false,
      errorCode: 'AI_RATE_LIMIT_REACHED',
      errorMessage: 'Limite por minuto atingido.',
    });
    const apiCall = vi.spyOn(AiGateway as any, 'callGeminiApiProxied');

    const result = await AiGateway.requestText({
      operation: 'catalog_extract_technical_specs',
      payload: { product: 'Cômoda' },
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('AI_RATE_LIMIT_REACHED');
    expect(apiCall).not.toHaveBeenCalled();
  });

});
