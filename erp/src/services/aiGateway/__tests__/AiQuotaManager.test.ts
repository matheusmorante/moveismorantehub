import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockLogs: any[] = [];
let mockInsertFn = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock('../../../pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn((_col: string, val: string) =>
                Promise.resolve({
                  data: mockLogs.filter(item => !item.created_at || item.created_at >= val),
                  error: null
                })
              )
            })),
            gte: vi.fn((_col: string, val: string) =>
              Promise.resolve({
                data: mockLogs.filter(item => !item.created_at || item.created_at >= val),
                error: null
              })
            )
          })),
          gte: vi.fn((_col: string, val: string) =>
            Promise.resolve({
              data: mockLogs.filter(item => !item.created_at || item.created_at >= val),
              error: null
            })
          )
        }))
      })),
      insert: mockInsertFn
    }))
  }
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
      cost_estimated: 0.20,
      units: 1,
      module_source: 'IMAGE'
    }));

    const usage = await AiQuotaManager.getMonthlyUsage('IMAGE');
    expect(usage.usedCount).toBe(10);
    expect(usage.costBRL).toBe(2.0);
    expect(usage.remainingBRL).toBe(28.0);
    expect(usage.percentUsed).toBe(7);
  });

  it('deve permitir reserva de cota quando o consumo estiver abaixo de R$ 30,00', async () => {
    mockLogs = [
      { cost_estimated: 0.20, units: 1, module_source: 'IMAGE' }
    ];

    const result = await AiQuotaManager.reserveQuota('IMAGE');
    expect(result.allowed).toBe(true);
    expect(mockInsertFn).toHaveBeenCalledTimes(1);
  });

  it('deve bloquear preventivamente a geração se atingir a cota mensal de R$ 30,00', async () => {
    // Simular que hoje foram feitas apenas 5 imagens, mas no mês corrente acumulou R$ 30,00
    const today = new Date().toISOString();
    const earlierThisMonth = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    mockLogs = [
      ...Array.from({ length: 5 }).map(() => ({ cost_estimated: 0.20, units: 1, module_source: 'IMAGE', created_at: today })),
      ...Array.from({ length: 145 }).map(() => ({ cost_estimated: 0.20, units: 1, module_source: 'IMAGE', created_at: earlierThisMonth }))
    ];

    const result = await AiQuotaManager.reserveQuota('IMAGE');
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe('AI_MONTHLY_LIMIT_REACHED');
    expect(result.errorMessage).toContain('30.00');
    expect(mockInsertFn).not.toHaveBeenCalled();
  });
});
