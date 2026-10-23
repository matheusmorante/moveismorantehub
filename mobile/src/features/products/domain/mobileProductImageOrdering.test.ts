import { describe, expect, it } from 'vitest';
import {
  moveMobileProductImageGlobally,
  replaceMobileProductImageGlobally,
} from './mobileProductImageOrdering';

describe('replaceMobileProductImageGlobally', () => {
  it('replaces the parent image and every variation reference, including the legacy primary field', () => {
    const product = {
      images: ['old.jpg', 'other.jpg'],
      variations: [
        { images: ['old.jpg', 'other.jpg'] },
        { images: ['old.jpg'], image_url: 'old.jpg' },
        { images: ['unrelated.jpg'], image_url: 'unrelated.jpg' },
      ],
    };

    expect(replaceMobileProductImageGlobally(product, 'old.jpg', 'new.jpg')).toEqual({
      images: ['new.jpg', 'other.jpg'],
      variations: [
        { images: ['new.jpg', 'other.jpg'] },
        { images: ['new.jpg'], image_url: 'new.jpg' },
        { images: ['unrelated.jpg'], image_url: 'unrelated.jpg' },
      ],
    });
  });

  it('keeps the ERP single-variation rule: the only variation inherits the full parent gallery', () => {
    const product = { images: ['old.jpg', 'other.jpg'], variations: [{ images: ['old.jpg'] }] };

    expect(replaceMobileProductImageGlobally(product, 'old.jpg', 'new.jpg').variations).toEqual([
      { images: ['new.jpg', 'other.jpg'] },
    ]);
  });

  it('uses the selected parent index only when the old URL is not present', () => {
    expect(
      replaceMobileProductImageGlobally({ images: ['first.jpg', 'second.jpg'] }, 'stale.jpg', 'new.jpg', 1)
        .images
    ).toEqual(['first.jpg', 'new.jpg']);
  });
});

describe('moveMobileProductImageGlobally', () => {
  it('reorders the parent gallery and keeps a single variation in inherited order', () => {
    const product = {
      images: ['a.jpg', 'b.jpg', 'c.jpg'],
      variations: [{ images: ['a.jpg', 'b.jpg', 'c.jpg'] }],
    };

    expect(moveMobileProductImageGlobally(product, 2, 1)).toEqual({
      images: ['a.jpg', 'c.jpg', 'b.jpg'],
      variations: [{ images: ['a.jpg', 'c.jpg', 'b.jpg'] }],
    });
    expect(product.images).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('keeps specific multi-variation galleries unchanged', () => {
    const variations = [{ images: ['a.jpg'] }, { images: ['b.jpg'] }];
    const product = { images: ['a.jpg', 'b.jpg', 'c.jpg'], variations };

    const reordered = moveMobileProductImageGlobally(product, 2, 0);

    expect(reordered.images).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
    expect(reordered.variations).toBe(variations);
  });
});
