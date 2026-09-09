import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchCategories: vi.fn() }));

vi.mock('../financial/mobileCategoryService', () => ({ fetchFinancialCategories: mocks.fetchCategories }));
vi.mock('../financial/mobilePayablesService', () => ({ fetchPayableAccounts: vi.fn() }));
vi.mock('../financial/mobileFinanceReports', () => ({ fetchMonthlySummary: vi.fn() }));
vi.mock('../financial/mobileTransactionCrudService', () => ({ createFinancialTransaction: vi.fn(), deleteFinancialTransaction: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: {} }));
vi.mock('./orderDeliveryAgentService', () => ({ getOrderDeliveryDetails: vi.fn(), searchOrdersAndDeliveries: vi.fn() }));

import { mobileAgentTools } from './mobileAgentTools';

describe('criarMovimentacaoFinanceira', () => {
  beforeEach(() => {
    mocks.fetchCategories.mockResolvedValue([
      { id: 'energy', name: 'Energia', type: 'expense' },
      { id: 'fuel', name: 'Combustível', type: 'expense' },
      { id: 'prolabore', name: 'Pró-labore', type: 'expense' },
    ]);
  });

  it('preserva categoria operacional para despesa empresarial', async () => {
    const result = await mobileAgentTools.criarMovimentacaoFinanceira({
      tipo: 'expense', valor: 200, descricao: 'Conta de luz', finalidade: 'BUSINESS', categoriaId: 'energy', formaPagamento: 'PIX',
    });

    expect(result.success).toBe(true);
    expect((result.data as any).categoriaNome).toBe('Energia');
  });

  it('exige Pró-labore quando a finalidade é particular', async () => {
    const result = await mobileAgentTools.criarMovimentacaoFinanceira({
      tipo: 'expense', valor: 200, descricao: 'Gasolina particular', finalidade: 'PERSONAL_PARTNER', categoriaId: 'fuel', formaPagamento: 'PIX',
    });

    expect(result).toMatchObject({ success: false, code: 'PERSONAL_CATEGORY_REQUIRED' });
  });
});
