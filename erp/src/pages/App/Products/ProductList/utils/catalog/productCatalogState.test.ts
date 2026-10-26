import { describe, expect, it } from 'vitest';
import { updateProductCatalogState } from './productCatalogState';
import { calculateVariationCatalogStats } from './registeredVariationCount';

const products: any[] = [
  {
    id: 'parent',
    sku: 'PARENT',
    status: 'hidden',
    variations: [
      { id: 'variation-a', sku: 'RED', status: 'hidden' },
      { id: 'variation-b', sku: 'BLUE', status: 'hidden' },
    ],
  },
];

describe('updateProductCatalogState', () => {
  it('atualiza somente a variação apontada pelo UUID', () => {
    const updated = updateProductCatalogState(products, 'variation-b', 'published');
    expect(updated[0].variations[0].status).toBe('hidden');
    expect(updated[0].variations[1].status).toBe('published');
    expect(updated[0].status).toBe('published');
  });

  it('sincroniza o status do pai quando ele possui uma única variação', () => {
    const singleVariationParent: any[] = [
      {
        id: 'single-parent',
        status: 'hidden',
        variations: [{ id: 'single-variation', sku: '000001-01', status: 'hidden' }],
      },
    ];

    const updated = updateProductCatalogState(
      singleVariationParent,
      'single-variation',
      'published'
    );

    expect(updated[0].status).toBe('published');
    expect(updated[0].variations[0].status).toBe('published');
  });

  it('mantém o pai publicado ao ocultar uma variação se outra continua publicada', () => {
    const publishedFamily: any[] = [
      {
        id: 'family-parent',
        status: 'published',
        variations: [
          { id: 'variation-to-hide', status: 'published' },
          { id: 'remaining-published-variation', status: 'published' },
        ],
      },
    ];

    const updated = updateProductCatalogState(publishedFamily, 'variation-to-hide', 'hidden');

    expect(updated[0].variations.map((variation: any) => variation.status)).toEqual([
      'hidden',
      'published',
    ]);
    expect(updated[0].status).toBe('published');
  });

  it('oculta o pai quando a última variação publicada é ocultada', () => {
    const lastPublishedFamily: any[] = [
      {
        id: 'last-family-parent',
        status: 'published',
        variations: [{ id: 'last-published-variation', status: 'published' }],
      },
    ];

    const updated = updateProductCatalogState(
      lastPublishedFamily,
      'last-published-variation',
      'hidden'
    );

    expect(updated[0].variations[0].status).toBe('hidden');
    expect(updated[0].status).toBe('hidden');
  });

  it('atualiza o produto e suas variações quando o ID é do pai', () => {
    const updated = updateProductCatalogState(products, 'parent', 'published');
    expect(updated[0].status).toBe('published');
    expect(updated[0].variations.every((variation: any) => variation.status === 'published')).toBe(
      true
    );
  });

  it('contabiliza produtos em rascunho no resumo mesmo sem variações estruturadas', () => {
    const stats = calculateVariationCatalogStats([
      {
        id: 'draft-1',
        is_draft: true,
        status: 'draft',
        active: false,
        deleted: false,
        product_variations: [],
      },
      {
        id: 'registered-1',
        is_draft: false,
        status: 'published',
        active: true,
        deleted: false,
        product_variations: [{ id: 'v1', sku: '000001-01', status: 'published', active: true }],
      },
    ]);

    expect(stats).toEqual({
      total: 1,
      published: 1,
      hidden: 0,
      active: 1,
      disabled: 0,
      drafts: 1,
    });
  });
});
