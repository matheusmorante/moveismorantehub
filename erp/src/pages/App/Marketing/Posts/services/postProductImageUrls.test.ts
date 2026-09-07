import { describe, expect, it } from 'vitest';
import { extractPostProductImageUrls } from './postProductImageUrls';

describe('extractPostProductImageUrls', () => {
  it('normaliza texto, JSON e listas de objetos', () => {
    expect(extractPostProductImageUrls(' first.jpg, second.jpg ')).toEqual(['first.jpg', 'second.jpg']);
    expect(extractPostProductImageUrls('["first.jpg", "second.jpg"]')).toEqual(['first.jpg', 'second.jpg']);
    expect(extractPostProductImageUrls([{ url: 'first.jpg' }, { image_url: 'second.jpg' }])).toEqual(['first.jpg', 'second.jpg']);
  });

  it('não propaga formatos desconhecidos', () => {
    expect(extractPostProductImageUrls('{invalid')).toEqual(['{invalid']);
    expect(extractPostProductImageUrls({})).toEqual([]);
  });
});
