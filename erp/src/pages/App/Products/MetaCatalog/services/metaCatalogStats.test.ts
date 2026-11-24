import { describe, expect, it } from 'vitest';
import { calculateMetaCatalogStats } from './metaCatalogStats';

describe('calculateMetaCatalogStats', () => {
  it('conta itens simples, variações publicáveis e itens ocultos sem duplicar o produto pai', () => {
    const stats = calculateMetaCatalogStats(
      [
        {
          id: 'parent-visible',
          deleted: false,
          deleted_at: null,
          active: true,
          status: 'published',
        },
        { id: 'parent-hidden', deleted: false, deleted_at: null, active: true, status: 'hidden' },
        {
          id: 'parent-simple',
          deleted: false,
          deleted_at: null,
          active: true,
          status: 'published',
        },
        {
          id: 'parent-deleted',
          deleted: true,
          deleted_at: null,
          active: true,
          status: 'published',
        },
      ],
      [
        { id: 'variation-active', product_id: 'parent-visible', active: true, status: 'published' },
        {
          id: 'variation-inactive',
          product_id: 'parent-visible',
          active: false,
          status: 'hidden',
        },
        {
          id: 'variation-under-hidden-parent',
          product_id: 'parent-hidden',
          active: true,
          status: 'published',
        },
        {
          id: 'variation-under-deleted-parent',
          product_id: 'parent-deleted',
          active: true,
          status: 'published',
        },
      ]
    );

    expect(stats).toEqual({
      publishedSimple: 1,
      publishedVariations: 1,
      notPublished: 2,
    });
  });

  it('conta itens inativos e mesclados como não publicados na Meta', () => {
    const stats = calculateMetaCatalogStats(
      [
        {
          id: 'paris-salvado',
          deleted: false,
          deleted_at: null,
          active: false,
          status: 'published',
          is_salvado: true,
          product_kind: 'salvado',
        },
        { id: 'parent-active', deleted_at: null, active: true, status: 'published' },
      ],
      [
        {
          id: 'paris-var-01',
          product_id: 'paris-salvado',
          active: false,
          status: 'published',
        },
        {
          id: 'paris-var-02',
          product_id: 'paris-salvado',
          active: false,
          status: 'hidden',
        },
        {
          id: 'var-merged', product_id: 'parent-active', active: true, status: 'published',
          merged_to_variation_id: 'target-var',
        },
      ]
    );

    expect(stats).toEqual({
      publishedSimple: 0,
      publishedVariations: 0,
      notPublished: 3,
    });
  });
});
