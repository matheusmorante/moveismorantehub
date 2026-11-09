import { describe, expect, it, vi } from 'vitest';
import { createImageLayer, imageTemplateFormSchema, isLayerVisible, startImageTemplate,
  type LayerCondition, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';
import { mapPreviewProduct, mapProductPreviewSource } from './productPreviewService';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

const product: TemplatePreviewProduct = { id: 'p1', images: [], currency: 'BRL',
  fields: {
    name: 'Cadeira Café', currentPrice: 79.90, price: 100, promoPrice: 79.90,
    discount: '20%', discountPercent: 20, discountValue: 20.10,
    stockOrigin: 'Salvados', color: 'Azul', category: 'Sala de Jantar',
    custom_label_0: 'Sala de Jantar', custom_label_3: 'Queima dos Salvados',
  },
  attributes: { attribute_material: { name: 'Material', value: 'MDF' } } };

const cases: [LayerCondition, boolean][] = [
  [{ field: 'name', operator: 'exists', value: '' }, true],
  [{ field: 'name', operator: 'empty', value: '' }, false],
  [{ field: 'brand', operator: 'empty', value: '' }, true],
  [{ field: 'brand', operator: 'exists', value: '' }, false],
  [{ field: 'name', operator: 'eq', value: '  cadeira cafe  ' }, true],
  [{ field: 'name', operator: 'ne', value: 'cadeira cafe' }, false],
  [{ field: 'name', operator: 'contains', value: 'CAFÉ' }, true],
  [{ field: 'name', operator: 'notContains', value: 'mesa' }, true],
  [{ field: 'name', operator: 'notContains', value: 'cafe' }, false],
  [{ field: 'brand', operator: 'ne', value: 'Outra marca' }, false],
  [{ field: 'currentPrice', operator: 'eq', value: 'R$ 79,90' }, true],
  [{ field: 'currentPrice', operator: 'ne', value: '79.90' }, false],
  [{ field: 'currentPrice', operator: 'gt', value: '79,89' }, true],
  [{ field: 'currentPrice', operator: 'gte', value: '79,90' }, true],
  [{ field: 'currentPrice', operator: 'lt', value: '79,91' }, true],
  [{ field: 'currentPrice', operator: 'lte', value: '79,90' }, true],
  [{ field: 'currentPrice', operator: 'lt', value: '79,90' }, false],
  [{ field: 'price', operator: 'exists', value: '' }, true],
  [{ field: 'price', operator: 'eq', value: '100,00' }, true],
  [{ field: 'promoPrice', operator: 'exists', value: '' }, true],
  [{ field: 'promoPrice', operator: 'lt', value: '80,00' }, true],
  [{ field: 'discount', operator: 'exists', value: '' }, true],
  [{ field: 'discount', operator: 'gt', value: '15' }, true],
  [{ field: 'discount', operator: 'gt', value: '25' }, false],
  [{ field: 'discountPercent', operator: 'gte', value: '20' }, true],
  [{ field: 'discountValue', operator: 'gt', value: '20,00' }, true],
  [{ field: 'stockOrigin', operator: 'eq', value: 'Salvados' }, true],
  [{ field: 'stockOrigin', operator: 'ne', value: 'Convencional' }, true],
  [{ field: 'color', operator: 'eq', value: 'azul' }, true],
  [{ field: 'color', operator: 'contains', value: 'zul' }, true],
  [{ field: 'category', operator: 'eq', value: 'sala de jantar' }, true],
  [{ field: 'custom_label_3', operator: 'contains', value: 'Salvados' }, true],
  [{ field: 'attribute_material', operator: 'eq', value: 'mdf' }, true],
  [{ field: 'attribute_cor', operator: 'exists', value: '' }, false],
];

describe('apresentação condicional', () => {
  it.each(cases)('avalia %j como %s', (condition, expected) => {
    const layer = { ...createImageLayer('text', '1:1'), condition };
    expect(isLayerVisible(layer, product)).toBe(expected);
  });

  it.each(['product', 'catalog', 'text', 'image', 'sticker'] as const)('aplica a condição em %s', (type) => {
    const base = createImageLayer(type, '1:1');
    if (base.type === 'background') throw new Error('Camada com posição esperada.');
    const layer = { ...base, condition: { field: 'attribute_material', operator: 'eq', value: 'MDF' } } as const;
    expect(isLayerVisible(layer, product)).toBe(true);
    expect(isLayerVisible(layer, { ...product, attributes: {} })).toBe(false);
    expect(isLayerVisible(layer, null)).toBe(false);
    expect(isLayerVisible({ ...layer, condition: null }, null)).toBe(true);
  });

  it.each([
    { field: 'currentPrice', operator: 'contains', value: '79' },
    { field: 'currentPrice', operator: 'gt', value: 'inválido' },
    { field: 'name', operator: 'lt', value: '80' },
    { field: 'attribute_material', operator: 'eq', value: '   ' },
  ])('impede salvar uma regra incompatível: %j', (condition) => {
    const design = startImageTemplate('blank');
    design.formats['1:1'].layers.unshift({ ...createImageLayer('text', '1:1'), condition } as never);
    expect(imageTemplateFormSchema.safeParse({ name: 'Modelo', description: '', design }).success).toBe(false);
  });

  it('respeita valores técnicos vazios da variação sem reaproveitar o valor do produto', () => {
    const source = mapProductPreviewSource({ id: 'p1', name: 'Mesa',
      technical_values: { Material: 'Madeira', Cor: 'Branco', Montagem: true, Gavetas: 3 },
      variation_details: [{ id: 'v1', technicalValues: { Material: '', Montagem: false, Gavetas: 0 } }],
      product_variations: [{ id: 'v1', product_id: 'p1', active: true, attributes: [{ name: 'Cor', value: null }] }] });
    const selected = mapPreviewProduct(source, 'v1');
    const condition = { field: 'attribute_material', operator: 'empty', value: '' } as const;
    const text = createImageLayer('text', '1:1');
    if (text.type !== 'text') throw new Error('Camada de texto esperada.');
    expect(isLayerVisible({ ...text, condition }, selected)).toBe(true);
    expect(selected.attributes).toMatchObject({ attribute_material: { value: '' }, attribute_cor: { value: '' },
      attribute_montagem: { value: 'Não' }, attribute_gavetas: { value: 0 } });
    expect(mapPreviewProduct(source).attributes?.attribute_material?.value).toBe('Madeira');
  });
});
