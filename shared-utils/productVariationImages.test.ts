import { describe, expect, it } from 'vitest';
import { parseVariationImages } from './productVariationImages';

describe('parseVariationImages', () => {
  it('normalizes legacy comma strings and deduplicates while preserving order', () => {
    expect(parseVariationImages('https://img.example/a.jpg, https://img.example/b.jpg', [
      'https://img.example/a.jpg',
    ])).toEqual(['https://img.example/a.jpg', 'https://img.example/b.jpg']);
  });

  it('reads JSON arrays and image objects from current and legacy fields', () => {
    expect(parseVariationImages('["https://img.example/c.jpg"]', [
      { url: 'https://img.example/a.jpg' },
      { image_url: 'https://img.example/b.jpg' },
    ])).toEqual([
      'https://img.example/a.jpg',
      'https://img.example/b.jpg',
      'https://img.example/c.jpg',
    ]);
  });

  it('falls back to comma separated values when a legacy JSON array is malformed', () => {
    expect(parseVariationImages('[broken, https://img.example/a.jpg')).toEqual([
      '[broken',
      'https://img.example/a.jpg',
    ]);
  });
});
