import { describe, expect, it, vi } from 'vitest';

const updateProduct = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/productService', () => ({ updateProduct }));

import { persistCatalogStatus } from './useProductsCatalogActions';

describe('persistCatalogStatus query invalidation', () => {
  it('adia a invalidação para o wrapper da lista', async () => {
    await persistCatalogStatus('legacy-product', 'hidden', { id: 'legacy-product' } as any);

    expect(updateProduct).toHaveBeenCalledWith(
      'legacy-product',
      { status: 'hidden' },
      { deferQueryInvalidation: true }
    );
  });
});
