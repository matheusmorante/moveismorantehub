import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Product from '../../types/product.type';
import { saveProduct } from './productMutationService';

const state = vi.hoisted(() => ({
  products: [] as Product[], saveInventoryMove: vi.fn(), persistDraft: vi.fn(),
  sync: vi.fn(), saveCache: vi.fn(), notify: vi.fn(),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../inventoryService', () => ({ saveInventoryMove: state.saveInventoryMove }));
vi.mock('./productDraftPersistence', () => ({ persistProductDraft: state.persistDraft }));
vi.mock('./productPersistenceService', () => ({ ensureUuidFormat: (product: Product) => product.id, syncProductToSupabase: state.sync }));
vi.mock('./productSkuService', () => ({ TABLE_NAME: 'products', generateUniqueCode: () => '999999', checkSkusUniquenessBatch: vi.fn(async () => ({})) }));
vi.mock('./productLocalCache', () => ({ getLocalProducts: () => state.products, saveLocalProducts: state.saveCache, notifySubscribers: state.notify }));

const createProduct = (isDraft: boolean): Product => ({
  id: '9b2ec3b1-8629-4514-b38b-3894fb33719f', code: '999999', name: 'TEST_AUT_Armário',
  description: '', unitPrice: 0, unit: 'UN', itemType: 'product', active: false, isDraft,
  status: isDraft ? 'draft' : 'hidden', stock: 9,
  launchInitialStock: true, initialStockEntries: [{ quantity: 4, unitCost: 20 }],
  variations: [{ id: '8a3f4c19-588b-48e4-a0d3-d3d5139cfe20', sku: '999999-01',
    name: 'TEST_AUT_Armário Azul', stock: 9, unitPrice: 0, active: false, attributes: [],
    launchInitialStock: true, initialStock: 9, initialCost: 100 } as any],
});

beforeEach(() => {
  state.products = [];
  state.persistDraft.mockResolvedValue(undefined);
  state.sync.mockResolvedValue(undefined);
});

describe('cadastro sem lançamento de estoque', () => {
  it.each([true, false])('ignora gatilhos legados de estoque inicial ao salvar, draft=%s', async (isDraft) => {
    await saveProduct(createProduct(isDraft));
    expect(state.saveInventoryMove).not.toHaveBeenCalled();
    if (isDraft) {
      expect(state.persistDraft).toHaveBeenCalledTimes(1);
      expect(state.sync).not.toHaveBeenCalled();
    } else {
      expect(state.sync).toHaveBeenCalledTimes(1);
    }
  });

  it('não grava o cache nem informa sucesso quando o rascunho falha no servidor', async () => {
    state.persistDraft.mockRejectedValueOnce(new Error('falha remota'));
    await expect(saveProduct(createProduct(true))).rejects.toThrow('falha remota');
    expect(state.products).toEqual([]);
    expect(state.saveCache).not.toHaveBeenCalled();
    expect(state.notify).not.toHaveBeenCalled();
  });
});
