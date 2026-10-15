import { describe, it, expect, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { flattenProductsForList } from './productListTransformers';
import type Product from '@/pages/types/product.type';

describe('flattenProductsForList - Regras de Variações e Produtos Mesclados', () => {
  it('marca isMerged como false quando nenhuma variação possui mergedToVariationId', () => {
    const products: Product[] = [
      {
        id: 'prod-1',
        name: 'Guarda Roupa Normal',
        code: '000100',
        hasVariations: true,
        variations: [
          { id: 'var-1', sku: '000100-01', name: 'Preto', active: true },
          { id: 'var-2', sku: '000100-02', name: 'Branco', active: true },
        ],
      } as any,
    ];

    const rows = flattenProductsForList(products);
    const parentRow = rows.find((r) => r.isParent);
    const varRows = rows.filter((r) => !r.isParent);

    expect(parentRow?.isMerged).toBe(false);
    expect(varRows[0]?.isMerged).toBe(false);
    expect(varRows[1]?.isMerged).toBe(false);
  });

  it('marca isMerged como true para o pai quando TODAS as variações foram mescladas', () => {
    const products: Product[] = [
      {
        id: 'prod-paris',
        name: 'Guarda Roupa Paris',
        code: '000312',
        hasVariations: true,
        variations: [
          {
            id: 'var-paris-1',
            sku: '000312-01',
            name: 'Guarda Roupa Paris 01',
            active: false,
            mergedToVariationId: 'target-uuid-314',
          },
        ],
      } as any,
    ];

    const rows = flattenProductsForList(products);
    const parentRow = rows.find((r) => r.isParent);
    const varRow = rows.find((r) => !r.isParent);

    expect(parentRow?.isMerged).toBe(true);
    expect(varRow?.isMerged).toBe(true);
    expect(varRow?.mergedToVariationId).toBe('target-uuid-314');
  });

  it('marca isMerged como false para o pai se apenas uma parte das variações foi mesclada', () => {
    const products: Product[] = [
      {
        id: 'prod-misto',
        name: 'Armário Misto',
        code: '000200',
        hasVariations: true,
        variations: [
          {
            id: 'var-1',
            sku: '000200-01',
            name: 'Ativo',
            active: true,
          },
          {
            id: 'var-2',
            sku: '000200-02',
            name: 'Mesclado',
            active: false,
            mergedToVariationId: 'target-uuid',
          },
        ],
      } as any,
    ];

    const rows = flattenProductsForList(products);
    const parentRow = rows.find((r) => r.isParent);
    const varRows = rows.filter((r) => !r.isParent);

    expect(parentRow?.isMerged).toBe(false);
    expect(varRows.find((v) => v.id === 'var-1')?.isMerged).toBe(false);
    expect(varRows.find((v) => v.id === 'var-2')?.isMerged).toBe(true);
  });
});
