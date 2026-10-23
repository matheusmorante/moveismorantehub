import { describe, expect, it } from 'vitest';
import { productTitleFieldsFromName } from '../../../../../shared-utils/productTitle';

describe('productTitleFieldsFromName', () => {
  it('mantém título e título do catálogo sincronizados com o nome principal', () => {
    expect(productTitleFieldsFromName('Mesa Aurora')).toEqual({
      title: 'Mesa Aurora',
      marketplaceTitle: 'Mesa Aurora',
    });
  });
});
