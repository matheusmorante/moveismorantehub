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
      name: 'Amêndoa',
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

  it('ignora produtos com is_draft: true', () => {
    const items = buildMetaCatalogItems(
      [
        {
          id: 'product-draft',
          name: 'Produto Rascunho',
          status: 'published',
          active: true,
          deleted: false,
          deleted_at: null,
          is_draft: true,
        },
      ],
      [],
      []
    );

    expect(items).toHaveLength(0);
  });

  it('resolve a categoria real (Ambiente > Categoria) e atribui condition, material, slug e url aos itens', () => {
    const product: MetaCatalogProductSource = {
      id: 'prod-cat-1',
      name: 'Armário Aéreo 3 Portas',
      slug: 'armario-aereo-3-portas',
      status: 'published',
      active: true,
      deleted: false,
      deleted_at: null,
      price: 599.9,
      is_salvado: true,
      material: 'MDF',
      product_categories: [
        { categories: { name: 'Cozinha', type: 'environment' } },
        { categories: { name: 'Armários Aéreos', type: 'category' } },
      ],
      images: ['https://example.com/armario.jpg'],
    };

    const variations: MetaCatalogVariationSource[] = [
      {
        id: 'var-1',
        product_id: 'prod-cat-1',
        sku: 'ARM-01-BR',
        name: 'Armário Aéreo - Branco',
        status: 'published',
        active: true,
        attributes: [{ name: 'Cor', value: 'Branco' }, { name: 'Tamanho', value: '120cm' }],
      },
    ];

    const items = buildMetaCatalogItems([product], variations, []);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'var-1',
      code: 'ARM-01-BR',
      name: 'Armário Aéreo - Branco',
      productType: 'Cozinha > Armários Aéreos',
      condition: 'refurbished',
      is_salvado: true,
      material: 'MDF',
      color: 'Branco',
      size: '120cm',
      slug: 'armario-aereo-3-portas',
      url: 'https://moveismorante.com.br/produto/armario-aereo-3-portas?var=var-1',
    });
  });

  it('aplica fallback "Móveis" e nunca "Furniture" quando produto não tem categoria', () => {
    const items = buildMetaCatalogItems(
      [
        {
          id: 'prod-sem-cat',
          name: 'Produto Sem Categoria',
          slug: 'prod-sem-cat',
          status: 'published',
          active: true,
          deleted: false,
          deleted_at: null,
          price: 100,
        },
      ],
      [],
      []
    );

    expect(items).toHaveLength(1);
    expect(items[0].productType).toBe('Móveis');
    expect(items[0].productType).not.toBe('Furniture');
    expect(items[0].condition).toBe('new');
    expect(items[0].url).toBe('https://moveismorante.com.br/produto/prod-sem-cat');
  });
});
