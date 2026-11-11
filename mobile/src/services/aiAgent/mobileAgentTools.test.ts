import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchCategories: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  listProductMetadata: vi.fn(),
}));

vi.mock('../financial/mobileCategoryService', () => ({
  fetchFinancialCategories: mocks.fetchCategories,
}));
vi.mock('../financial/mobilePayablesService', () => ({ fetchPayableAccounts: vi.fn() }));
vi.mock('../financial/mobileFinanceReports', () => ({ fetchMonthlySummary: vi.fn() }));
vi.mock('../financial/mobileTransactionCrudService', () => ({
  createFinancialTransaction: vi.fn(),
  deleteFinancialTransaction: vi.fn(),
}));
vi.mock('../supabaseClient', () => ({ supabase: {} }));
vi.mock('./orderDeliveryAgentService', () => ({
  getOrderDeliveryDetails: vi.fn(),
  searchOrdersAndDeliveries: vi.fn(),
}));
vi.mock('../../../../shared-utils/agentProductOperations', () => ({
  createProductForAgent: mocks.createProduct,
  updateProductForAgent: mocks.updateProduct,
  listProductCategoriesAndCharacteristicsForAgent: mocks.listProductMetadata,
}));

import { mobileAgentTools } from './mobileAgentTools';
import { MobileToolDispatcher } from './mobileToolDispatcher';

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
      tipo: 'expense',
      valor: 200,
      descricao: 'Conta de luz',
      finalidade: 'BUSINESS',
      categoriaId: 'energy',
      formaPagamento: 'PIX',
    });

    expect(result.success).toBe(true);
    expect((result.data as any).categoriaNome).toBe('Energia');
  });

  it('exige Pró-labore quando a finalidade é particular', async () => {
    const result = await mobileAgentTools.criarMovimentacaoFinanceira({
      tipo: 'expense',
      valor: 200,
      descricao: 'Gasolina particular',
      finalidade: 'PERSONAL_PARTNER',
      categoriaId: 'fuel',
      formaPagamento: 'PIX',
    });

    expect(result).toMatchObject({ success: false, code: 'PERSONAL_CATEGORY_REQUIRED' });
  });

  it('despacha a criação de produto com perfil autorizado e encaminha o contexto ao handler', async () => {
    mocks.createProduct.mockResolvedValueOnce({
      success: true,
      data: { codigo: '000999', nome: 'Sofá Retrátil' },
    });
    const permissionContext = { role: 'administrator', enforced: true };

    const result = await MobileToolDispatcher.execute(
      {
        name: 'criarProduto',
        args: {
          nome: 'Sofá Retrátil',
          categoria: 'Sofás',
          marca: 'Morante',
          precoVenda: 2990,
          estoque: 2,
        },
      },
      permissionContext
    );

    expect(result.record.result.success).toBe(true);
    expect(mocks.createProduct).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ nome: 'Sofá Retrátil', precoVenda: 2990 }),
      true
    );
  });
});
