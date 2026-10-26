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

  it('removes the parent photo from legacy image_url references in multi-variation families', () => {
    const product = {
      images: ['cover.jpg', 'side.jpg'],
      variations: [
        { id: 'v1', images: ['side.jpg'], image_url: 'cover.jpg,side.jpg' },
        { id: 'v2', image_url: 'cover.jpg' },
      ],
    };

    expect(removeProductImageGlobally(product, 'cover.jpg')).toEqual({
      images: ['side.jpg'],
      variations: [
        { id: 'v1', images: ['side.jpg'], image_url: 'side.jpg' },
        { id: 'v2', images: [], image_url: null },
      ],
    });
  });

  it('keeps legacy image_url synchronized when removing a photo from a single variation', () => {
    const product = {
      images: ['cover.jpg', 'side.jpg'],
      variations: [{ id: 'v1', image_url: 'cover.jpg,side.jpg' }],
    };

    expect(removeProductImageGlobally(product, 'cover.jpg').variations).toEqual([
      { id: 'v1', images: ['side.jpg'], image_url: 'side.jpg' },
    ]);
  });
});
