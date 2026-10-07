import { describe, expect, it } from 'vitest';
import { mapDbVariations } from './productVariationMapper';

describe('mapDbVariations', () => {
  it('normaliza o nome de variações legadas para o mesmo padrão visual', () => {
    const variations = mapDbVariations(
      [
        {
          id: 'variation-01',
          product_id: 'product-1',
          sku: '003962-01',
          name: 'ARMARIO MULTIUSO ARAMOVEIS NEW 2PT BRANCO',
          attributes: { Cor: 'BRANCO' },
        },
        {
          id: 'variation-02',
          product_id: 'product-1',
          sku: '003962-02',
          name: 'Armario Multiuso Aramoveis New 2pt Off White',
          attributes: { Cor: 'Off White' },
        },
      ],
      { name: 'ARMARIO MULTIUSO ARAMOVEIS NEW 2PT', unit_price: 249, active: true },
      '003962'
    );

    expect(variations.map((variation) => variation.name)).toEqual([
      'Armario Multiuso Aramoveis New 2pt Branco',
      'Armario Multiuso Aramoveis New 2pt Off White',
    ]);
    expect(variations[0].attributes).toEqual([{ name: 'Cor', value: 'Branco', showName: true }]);
  });

  it('preserva showName falso em atributos armazenados como JSON serializado', () => {
    const variations = mapDbVariations(
      [
        {
          id: 'variation-03',
          product_id: 'product-1',
          sku: '003962-03',
          name: 'Armario Branco',
          attributes: JSON.stringify([
            { name: 'Cor', value: 'Branco', showName: true },
            { name: 'Quantidade de portas', value: '6 portas', showName: false },
          ]),
        },
      ],
      { name: 'Armario', unit_price: 249, active: true },
      '003962'
    );

    expect(variations[0].attributes).toEqual([
      { name: 'Cor', value: 'Branco', showName: true },
      { name: 'Quantidade de Portas', value: '6 Portas', showName: false },
    ]);
  });

  it('carrega os componentes persistidos por variação', () => {
    const comboItems = [
      { productId: 'component-1', variationId: 'component-variation-1', quantity: 2 },
    ];
    const variations = mapDbVariations(
      [
        {
          id: 'variation-04',
          product_id: 'product-1',
          sku: '003962-04',
          name: 'Kit com componentes',
          attributes: [],
          combo_items: comboItems,
        },
      ],
      { name: 'Kit', unit_price: 249, active: true },
      '003962'
    );

    expect(variations[0].comboItems).toEqual(comboItems);
  });

  it('lê campos herdados da variação única a partir dos dados atuais do produto', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const [variation] = mapDbVariations(
      [{
        id,
        product_id: 'product-1',
        sku: '003962-01',
        name: 'Nome antigo',
        image_url: 'https://example.test/photo.jpg',
        use_parent_name: true,
        use_parent_price: true,
        use_parent_promo_price: true,
        use_parent_dimensions: true,
        use_parent_description: true,
        attributes: [],
      }],
      {
        id: 'product-1',
        name: 'Produto atual',
        unit_price: 100,
        promo_price: 90,
        cost_price: 60,
        description: 'Descrição atual',
        condition: 'usado',
        fiscal: { ncm: '94035000' },
        width: '30',
        height: '40',
        depth: '20',
        ipi_percent: 5,
        freight_cost: 12,
        freight_type: 'fixed',
        technical_specs: {
          variationDetails: [{
            id,
            syncCostPrice: true,
            syncCondition: true,
            syncFiscal: true,
            syncWidth: true,
            syncHeight: true,
            syncDepth: true,
            syncWeight: true,
            syncIpi: true,
            syncFreight: true,
          }],
        },
      },
      '003962'
    );

    expect(variation).toMatchObject({
      name: 'Produto Atual',
      unitPrice: 100,
      promoPrice: 90,
      costPrice: 60,
      description: 'Descrição atual',
      condition: 'usado',
      fiscal: { ncm: '94035000' },
      width: 30,
      height: 40,
      depth: 20,
      ipiPercent: 5,
      freightCost: 12,
      freightType: 'fixed',
      images: ['https://example.test/photo.jpg'],
    });
  });
});
