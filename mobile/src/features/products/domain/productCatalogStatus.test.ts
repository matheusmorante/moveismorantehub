import { describe, expect, it } from 'vitest';
import { resolveProductCatalogParentStatus } from '../../../../../shared-utils/productCatalogStatus';

describe('resolveProductCatalogParentStatus', () => {
  it('mantém o pai publicado se uma variação da família continua publicada', () => {
    expect(
      resolveProductCatalogParentStatus([
        { status: 'hidden' },
        { status: 'published' },
      ])
    ).toBe('published');
  });

  it('oculta o pai quando nenhuma variação continua publicada', () => {
    expect(
      resolveProductCatalogParentStatus([
        { status: 'hidden' },
        { status: 'draft' },
      ])
    ).toBe('hidden');
  });
});
