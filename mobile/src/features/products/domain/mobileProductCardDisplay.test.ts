import { describe, expect, it } from 'vitest';
import {
  getMobileProductCompositionCardItems,
  getMobileProductVariationCardName,
  getSingleVariationDisplayName,
} from './mobileProductCardDisplay';

describe('getMobileProductVariationCardName', () => {
  it('exibe o nome da variação como ERP sem revelar atributos showName=false', () => {
    expect(
      getMobileProductVariationCardName(
        { name: 'Tênis' },
        {
          name: 'tênis azul',
          attributes: [
            { name: 'Cor', value: 'Azul', showName: true },
            { name: 'Lote interno', value: 'Premium', showName: false },
          ],
        },
        0
      )
    ).toBe('Tênis Azul');
  });

  it('usa o mesmo nome composto pelo ERP quando o nome salvo da variação está ausente', () => {
    expect(
      getMobileProductVariationCardName(
        { name: 'Tênis' },
        {
          attributes: [
            { name: 'Cor', value: 'Azul', showName: true },
            { name: 'Lote interno', value: 'Premium', showName: false },
          ],
        },
        1
      )
    ).toBe('Tênis Azul');
  });

  it('não infere atributo Cor das especificações técnicas do produto pai', () => {
    expect(
      getSingleVariationDisplayName(
        { name: 'Sofá', technical_specs: { Cor: 'Azul' } },
        { name: 'Sofá', attributes: [] }
      )
    ).toBe('Sofá');
  });

  it('remove o separador repetido entre nome do pai e variação como o ERP', () => {
    expect(
      getSingleVariationDisplayName(
        { name: 'Tênis' },
        {
          name: 'Tênis - Azul',
          attributes: [{ name: 'Cor', value: 'Azul' }],
        }
      )
    ).toBe('Tênis Azul');
  });
});

describe('getMobileProductCompositionCardItems', () => {
  it('espelha os nomes curtos do subtítulo de composição do ERP', () => {
    expect(
      getMobileProductCompositionCardItems({
        itemType: 'composition',
        comboItems: [
          { description: 'Mesa Aurora - SKU-1' },
          { description: 'Cadeira Horizonte' },
        ],
      })
    ).toEqual(['Mesa Aurora', 'Cadeira Horizonte']);
  });

  it('aceita aliases legados e dados de componentes serializados', () => {
    expect(
      getMobileProductCompositionCardItems({
        item_type: 'composition',
        combo_items: JSON.stringify([{ description: 'Sofá Modular - Azul' }]),
      })
    ).toEqual(['Sofá Modular']);
  });

  it('não mostra resumo em produto comum e usa fallback para componente sem descrição', () => {
    expect(
      getMobileProductCompositionCardItems({
        itemType: 'product',
        comboItems: [{ description: 'Item ignorado' }],
      })
    ).toEqual([]);
    expect(
      getMobileProductCompositionCardItems({
        isCombo: true,
        comboItems: [{ description: '' }],
      })
    ).toEqual(['Item sem nome']);
  });
});
