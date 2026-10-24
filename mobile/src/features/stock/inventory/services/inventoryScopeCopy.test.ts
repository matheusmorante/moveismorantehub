import { describe, expect, it } from 'vitest';
import type { SearchableProduct } from '../modals/InventoryProductSearchModal';
import { resolveInventoryScopeCopy } from './inventoryScopeCopy';

const currentProducts: SearchableProduct[] = [
  { id: 'product-family', variation_id: 'variation-a', name: 'Variação A atual', stock: 8, sku: 'A' },
  { id: 'product-family', variation_id: 'variation-b', name: 'Variação B atual', stock: 3, sku: 'B' },
  { id: 'product-simple', variation_id: 'variation-simple', name: 'Produto simples atual', stock: 5, sku: 'SIMPLE' },
];

describe('resolveInventoryScopeCopy', () => {
  it('usa os dados e o saldo atuais para a variação que ainda existe', () => {
    const result = resolveInventoryScopeCopy(
      [{ productId: 'product-family', variationId: 'variation-b' }],
      currentProducts
    );

    expect(result).toEqual({ valid: true, products: [currentProducts[1]] });
  });

  it('expande um item antigo sem UUID para as variações atuais do produto', () => {
    const result = resolveInventoryScopeCopy([{ productId: 'product-family' }], currentProducts);

    expect(result).toEqual({ valid: true, products: currentProducts.slice(0, 2) });
  });

  it('usa a variação atual do produto simples quando a cópia não tinha UUID de variação', () => {
    const result = resolveInventoryScopeCopy([{ productId: 'product-simple' }], currentProducts);

    expect(result).toEqual({ valid: true, products: [currentProducts[2]] });
  });

  it.each([
    { copied: [], catalog: currentProducts },
    { copied: [{ productId: 'removed-product' }], catalog: currentProducts },
    { copied: [{ productId: 'product-family', variationId: 'removed-variation' }], catalog: currentProducts },
    { copied: [{ productId: 'product-family' }, { productId: 'product-family', variationId: 'variation-a' }], catalog: currentProducts },
    { copied: [{ productId: 'product-family', variationId: 'variation-a' }, { productId: 'product-family', variationId: 'variation-a' }], catalog: currentProducts },
  ])('rejeita cópia vazia, indisponível ou com identidades duplicadas %#', ({ copied, catalog }) => {
    const result = resolveInventoryScopeCopy(copied, catalog);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('itens indisponíveis');
  });
});
