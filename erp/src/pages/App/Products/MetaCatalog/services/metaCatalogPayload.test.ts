import { describe, expect, it } from 'vitest';
import {
  buildMetaCatalogItems,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from './metaCatalogPayload';

describe('buildMetaCatalogItems', () => {
  it('publica somente variações ativas e visíveis e compõe seus dados com o produto pai', () => {
    const product: MetaCatalogProductSource = {
      id: 'product-1',
      name: 'Mesa Morante',
      description: 'Descrição interna',
      whatsapp_description: 'Descrição para WhatsApp',
      status: 'published',
      active: true,
      deleted: false,
      deleted_at: null,
      opportunity_id: 'opportunity-1',
      price: 400,
      images: ['mesa-1.jpg'],
    };
    const variations: MetaCatalogVariationSource[] = [
      {
        id: 'variation-1',
        product_id: product.id,
        status: 'published',
        active: true,
        name: 'Amêndoa',
        sku: 'MESA-AMENDOA',
        price: 250,
        stock: 3,
      },
      {
        id: 'variation-inactive',
        product_id: product.id,
        status: 'published',
        active: false,
      },
      {
        id: 'variation-hidden',
        product_id: product.id,
        status: 'hidden',
        active: true,
      },
    ];

    const items = buildMetaCatalogItems([product], variations, [
      { id: 'opportunity-1', name: 'Liquidação', observations: 'Semana especial' },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'variation-1',
      code: 'MESA-AMENDOA',
      name: 'Mesa Morante - Amêndoa',
      sales_price: 250,
      stock: 3,
      images: ['mesa-1.jpg'],
      brand: 'Móveis Morante',
    });
    expect(items[0].description).toContain('Aviso Importante (Liquidação): Semana especial');
    expect(items[0].description).toContain('Descrição para WhatsApp');
    expect(items[0].description).not.toContain('Descrição interna');
  });

  it('mantém produtos simples e aplica os fallbacks existentes de preço, código e marca', () => {
    const items = buildMetaCatalogItems(
      [
        {
          id: 'product-simple',
          title: 'Sofá Morante',
          description: 'Descrição do sofá\nDetalhe adicional',
          deleted: false,
          deleted_at: null,
          status: 'published',
          active: true,
          sku: 'SOFA-01',
        },
      ],
      [],
      []
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'product-simple',
      code: 'SOFA-01',
      name: 'Sofá Morante',
      sales_price: 0,
      images: [],
      brand: 'Móveis Morante',
    });
    expect(items[0].description).toContain('Descrição do sofá');
    expect(items[0].description).toContain('Detalhe adicional');
  });
});
