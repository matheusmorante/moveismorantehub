import { describe, expect, it } from 'vitest';
import { removeProductImageGlobally } from '../../../../../shared-utils/productImageOperations';

describe('removeProductImageGlobally', () => {
  it('removes the parent photo from every multi-variation link while preserving unrelated images', () => {
    const product = {
      images: ['cover.jpg', 'side.jpg', 'detail.jpg'],
      variations: [
        { id: 'v1', images: ['cover.jpg', 'side.jpg'] },
        { id: 'v2', images: ['detail.jpg', 'cover.jpg'] },
        { id: 'v3', images: ['detail.jpg'] },
      ],
    };

    expect(removeProductImageGlobally(product, 'cover.jpg')).toEqual({
      images: ['side.jpg', 'detail.jpg'],
      variations: [
        { id: 'v1', images: ['side.jpg'] },
        { id: 'v2', images: ['detail.jpg'] },
        { id: 'v3', images: ['detail.jpg'] },
      ],
    });
  });

  it('keeps a single variation synchronized with the remaining parent gallery', () => {
    const product = {
      images: ['cover.jpg', 'side.jpg'],
      variations: [{ id: 'v1', images: ['cover.jpg'] }],
    };

    expect(removeProductImageGlobally(product, 'cover.jpg').variations).toEqual([
      { id: 'v1', images: ['side.jpg'] },
    ]);
  });
});
