import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { saveVariation } from './productVariationActionsService';
import { mapDbVariations } from './productVariationMapper';
const mocks = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), update: vi.fn(), eq: vi.fn(), local: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('./productLocalCache', () => ({ LOCAL_STORAGE_KEY: 'products', getLocalProducts: mocks.local, saveLocalProducts: vi.fn(), notifySubscribers: vi.fn() }));
vi.mock('./productMutationService', () => ({ updateProduct: vi.fn(), invalidateProductQueries: vi.fn() }));
vi.mock('./productMetaCatalogSync', () => ({ triggerProductMetaCatalogSync: vi.fn() }));
const parentId = '00000000-0000-4000-8000-000000000001';
const oldId = '00000000-0000-4000-8000-000000000002';
const newId = '00000000-0000-4000-8000-000000000003';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.local.mockReturnValue([{ id: parentId, name: 'Mesa', code: '101', unitPrice: 200, stock: 8, costPrice: 7, technicalSpecs: { preservar: 'valor' }, variations: [{ id: oldId, sku: '101-01', stock: 8 }] } as Product]);
  mocks.upsert.mockResolvedValue({ error: null }); mocks.eq.mockResolvedValue({ error: null }); mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ upsert: mocks.upsert, update: mocks.update });
});
describe('persistência dos dados próprios da variação no cadastro rápido', () => {
  it('preserva custo próprio e metadados, sem regravar saldo ou preço do pai', async () => {
    await saveVariation(parentId, { id: newId, name: 'Mesa azul', sku: '101-02', stock: 0, costPrice: 55, syncCostPrice: false, barcode: '7891234567895', syncNcm: false, fiscal: { ncm: '94035000' } });
    const payload = mocks.update.mock.calls[0][0];
    expect(payload).toMatchObject({ has_variations: true, technical_specs: { preservar: 'valor', variationDetails: [expect.objectContaining({ id: oldId }), expect.objectContaining({ id: newId, costPrice: 55, syncCostPrice: false, barcode: '7891234567895', syncNcm: false, fiscal: { ncm: '94035000' } })] } });
    expect(payload).not.toHaveProperty('stock'); expect(payload).not.toHaveProperty('unit_price');
    const mapped = mapDbVariations([mocks.upsert.mock.calls[0][0]], { cost_price: 7, technical_specs: payload.technical_specs }, '101');
    expect(mapped[0].costPrice).toBe(55);
    expect(mapped[0].barcode).toBe('7891234567895');
    expect(mapped[0].syncNcm).toBe(false);
  });
  it('propaga falha da gravação de metadados para não declarar cadastro completo', async () => {
    mocks.eq.mockResolvedValue({ error: new Error('Gravação não confirmada') });
    await expect(saveVariation(parentId, { id: newId, name: 'Mesa azul', sku: '101-02', stock: 0 })).rejects.toThrow('Gravação não confirmada');
  });
});
