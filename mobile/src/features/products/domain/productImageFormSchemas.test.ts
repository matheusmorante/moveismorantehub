import { describe, expect, it } from 'vitest';
import {
  createProductImageCropSourceFormSchema,
  createVariationImageListEditFormSchema,
  createVariationImageSelectionFormSchema,
} from '../../../../../shared-utils/productImageFormSchemas';

describe('createProductImageCropSourceFormSchema', () => {
  it('accepts a crop source still present in the variation gallery', () => {
    const schema = createProductImageCropSourceFormSchema(['https://images.test/source.webp']);

    expect(schema.safeParse({ oldUrl: 'https://images.test/source.webp' }).success).toBe(true);
  });

  it('rejects a stale crop source before uploading the replacement', () => {
    const schema = createProductImageCropSourceFormSchema(['https://images.test/current.webp']);

    expect(schema.safeParse({ oldUrl: 'https://images.test/removed.webp' })).toMatchObject({
      success: false,
      error: { issues: [{ message: 'A foto de origem mudou. Reabra o recorte.' }] },
    });
  });
});

describe('variation image form schemas', () => {
  it('allows editing a legacy linked URL no longer present on the parent gallery', () => {
    const schema = createVariationImageListEditFormSchema(2);

    expect(schema.safeParse({ images: ['https://images.test/legacy.webp'] }).success).toBe(true);
    expect(schema.safeParse({ images: [] }).success).toBe(true);
  });

  it('keeps the maximum and unique-URL constraints when reordering or unlinking', () => {
    const schema = createVariationImageListEditFormSchema(2);

    expect(schema.safeParse({ images: ['a', 'b', 'c'] }).success).toBe(false);
    expect(schema.safeParse({ images: ['a', 'a'] }).success).toBe(false);
  });

  it('still restricts newly selected links to unique images from the parent gallery', () => {
    const schema = createVariationImageSelectionFormSchema(['https://images.test/current.webp'], 2);

    expect(schema.safeParse({ images: ['https://images.test/legacy.webp'] }).success).toBe(false);
    expect(schema.safeParse({ images: ['https://images.test/current.webp'] }).success).toBe(true);
  });
});
