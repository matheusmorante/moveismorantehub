import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockLogs: any[] = [];
let mockCount: number | null = null;
let mockError: any = null;
const mockInsertFn = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock('../../../pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn((_cols: any, opts?: any) => {
        const buildChain = (filters: any) => ({
          eq: vi.fn((col: string, val: any) => buildChain({ ...filters, [col]: val })),
          gte: vi.fn((_col: string, val: string) => {
            if (mockError) {
              return Promise.resolve({ data: null, count: null, error: mockError });
            }
            const filtered = mockLogs.filter((item) => !item.created_at || item.created_at >= val);
            const count = mockCount !== null ? mockCount : filtered.length;
            return Promise.resolve({
              data: opts?.head ? null : filtered,
              count,
              error: null,
            });
          }),
        });
        return buildChain({});
      }),
      insert: mockInsertFn,
    })),
  },
}));

import { AiQuotaManager } from '../core/AiQuotaManager';

describe('AiQuotaManager - Cota Mensal de R$ 30,00 para Geração de Imagens', () => {
  beforeEach(() => {
    mockLogs = [];
    mockInsertFn.mockClear();
    vi.restoreAllMocks();
  });

  it('deve calcular o início do mês atual em ISO UTC', () => {
    const startIso = AiQuotaManager.getStartOfMonthIso();
    expect(startIso).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
  });

  it('deve retornar relatório com saldo de R$ 30,00 quando não houver consumo', async () => {
    mockLogs = [];
    const usage = await AiQuotaManager.getMonthlyUsage('IMAGE');
    expect(usage.budgetBRL).toBe(30.0);
    expect(usage.costBRL).toBe(0);
    expect(usage.remainingBRL).toBe(30.0);
    expect(usage.usedCount).toBe(0);
  });

  it('deve calcular corretamente o custo consumido e o saldo restante no mês', async () => {
    // Simular 10 imagens geradas a R$ 0,20 cada = R$ 2,00
    mockLogs = Array.from({ length: 10 }).map(() => ({
      cost_estimated: 0.2,
      units: 1,
      module_source: 'IMAGE',
    }));

    const usage = await AiQuotaManager.getMonthlyUsage('IMAGE');
    expect(usage.usedCount).toBe(10);
    expect(usage.costBRL).toBe(2.0);
    expect(usage.remainingBRL).toBe(28.0);
    expect(usage.percentUsed).toBe(7);
  });

  it('deve permitir reserva de cota quando o consumo estiver abaixo de R$ 30,00', async () => {
    mockLogs = [{ cost_estimated: 0.2, units: 1, module_source: 'IMAGE' }];

    const result = await AiQuotaManager.reserveQuota('IMAGE');
    expect(result.allowed).toBe(true);
    expect(mockInsertFn).toHaveBeenCalledTimes(1);
  });

  it('deve bloquear preventivamente a geração se atingir a cota mensal de R$ 30,00', async () => {
    // Simular que hoje foram feitas apenas 5 imagens, mas no mês corrente acumulou R$ 30,00
    const today = new Date().toISOString();
    const earlierThisMonth = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    mockLogs = [
      ...Array.from({ length: 5 }).map(() => ({
        cost_estimated: 0.2,
        units: 1,
        module_source: 'IMAGE',
        created_at: today,
      })),
      ...Array.from({ length: 145 }).map(() => ({
        cost_estimated: 0.2,
        units: 1,
        module_source: 'IMAGE',
        created_at: earlierThisMonth,
      })),
    ];

    const result = await AiQuotaManager.reserveQuota('IMAGE');
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe('AI_MONTHLY_LIMIT_REACHED');
    expect(result.errorMessage).toContain('30.00');
    expect(mockInsertFn).not.toHaveBeenCalled();
  });
});

describe('AiQuotaManager - Cota de Preenchimento de Características (20 req/h e 80 req/dia)', () => {
  beforeEach(() => {
    mockLogs = [];
    mockCount = null;
    mockError = null;
    mockInsertFn.mockClear();
    vi.restoreAllMocks();
  });

  it('deve retornar estatísticas de uso padrão quando não houver requisições', async () => {
    mockCount = 0;
    const stats = await AiQuotaManager.getCharacteristicsUsageStats();
    expect(stats.usedToday).toBe(0);
    expect(stats.limitToday).toBe(80);
    expect(stats.usedHour).toBe(0);
    expect(stats.limitHour).toBe(20);
  });

  it('deve permitir reserva de cota quando o consumo estiver abaixo dos limites', async () => {
    mockCount = 5; // 5 reqs hoje e na última hora
    const result = await AiQuotaManager.reserveCharacteristicsQuota();
    expect(result.allowed).toBe(true);
    expect(mockInsertFn).toHaveBeenCalledTimes(1);
    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'gemini',
          operation: 'catalog_extract_technical_specs',
          module_source: 'characteristics_ai',
        }),
      ])
    );
  });

  it('deve bloquear a requisição se atingir o limite estrito de 20 requisições por hora', async () => {
    mockCount = 20; // 20 reqs na hora
    const result = await AiQuotaManager.reserveCharacteristicsQuota();
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe('AI_HOURLY_LIMIT_REACHED');
    expect(result.errorMessage).toContain('20/20');
    expect(mockInsertFn).not.toHaveBeenCalled();
  });

  it('deve bloquear a requisição se atingir o limite diário de 80 requisições', async () => {
    // Simular que na última hora foram poucas, mas no dia foram 80
    // Usando mockLogs com timestamps para diferenciar hora de dia
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    mockLogs = [
      ...Array.from({ length: 5 }).map(() => ({ created_at: new Date().toISOString() })),
      ...Array.from({ length: 75 }).map(() => ({ created_at: fourHoursAgo })),
    ];
    // mockCount null uses mockLogs.filter by gte val
    mockCount = null;

    const result = await AiQuotaManager.reserveCharacteristicsQuota();
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe('AI_DAILY_LIMIT_REACHED');
    expect(result.errorMessage).toContain('80/80');
    expect(mockInsertFn).not.toHaveBeenCalled();
  });

  it('deve bloquear preventivamente em caso de falha de conexão com o banco (FAIL-CLOSED)', async () => {
    mockError = { message: 'Database connection timeout' };
    const result = await AiQuotaManager.reserveCharacteristicsQuota();
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe('AI_FAIL_CLOSED_BLOCKED');
    expect(result.errorMessage).toContain('FAIL CLOSED');
    expect(mockInsertFn).not.toHaveBeenCalled();
  });
});

