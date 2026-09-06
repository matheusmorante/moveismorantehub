import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
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
    AiCircuitBreaker.resetCategory('TTS');
    AiDeduplicator.clear();
    vi.restoreAllMocks();
  });

  it('deve rejeitar concorrência de texto acima de 3 chamadas simultâneas', async () => {
    // Mockar reserveQuota para simular cota liberada
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({ allowed: true });

    // Bloquear chamadas de rede reais
    vi.spyOn(AiGateway as any, 'callGeminiApiProxied').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('OK'), 200))
    );

    // Disparar 4 requisições paralelas
    const req1 = AiGateway.requestText({ operation: 'op1', payload: 'p1', bypassDeduplication: true });
    const req2 = AiGateway.requestText({ operation: 'op2', payload: 'p2', bypassDeduplication: true });
    const req3 = AiGateway.requestText({ operation: 'op3', payload: 'p3', bypassDeduplication: true });
    const req4 = AiGateway.requestText({ operation: 'op4', payload: 'p4', bypassDeduplication: true });

    const results = await Promise.all([req1, req2, req3, req4]);
    const blockedCount = results.filter(r => r.errorCode === 'AI_CONCURRENCY_LIMIT_REACHED').length;

    expect(blockedCount).toBeGreaterThanOrEqual(1);
  });

  it('deve aplicar o princípio Fail Closed em caso de falha de comunicação do limiter', async () => {
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({
      allowed: false,
      errorCode: 'AI_FAIL_CLOSED_BLOCKED',
      errorMessage: 'FAIL CLOSED: Erro de banco de dados.'
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

  it('deve acionar o Fallback de TTS nativo caso a cota diária de voz (30/dia) seja atingida', async () => {
    vi.spyOn(AiQuotaManager, 'reserveQuota').mockResolvedValue({
      allowed: false,
      errorCode: 'AI_DAILY_LIMIT_REACHED',
      errorMessage: 'Limite Diário de TTS Atingido: 30/30'
    });

    const ttsRes = await AiGateway.requestTts('Mensagem de aviso importante');
    expect(ttsRes.success).toBe(true); // O gateway resolve com sucesso pelo fallback nativo
    expect(ttsRes.fallbackUsed).toBe(true);
    expect(ttsRes.modelUsed).toContain('native-speech-fallback');
  });
});
