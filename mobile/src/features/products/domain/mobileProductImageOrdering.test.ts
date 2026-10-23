import { describe, expect, it } from 'vitest';
import { replaceMobileProductImageGlobally } from './mobileProductImageOrdering';

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
