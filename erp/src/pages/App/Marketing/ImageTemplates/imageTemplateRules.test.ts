import { describe, expect, it, vi } from 'vitest';
import {
  copyImageLayout, createImageLayer, imageTemplateFormSchema, isLayerVisible, parseCatalogPrice, startImageTemplate,
} from '../../../../../../shared-utils/catalogImageTemplate';
import { mapPreviewProduct, mapProductPreviewSource } from './productPreviewService';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

describe('modelos de imagem', () => {
  it('copia camadas para um formato independente e preserva a proporção quadrada original', () => {
    const design = startImageTemplate('offer');
    const original = design.formats['1:1'];
    const vertical = copyImageLayout(original, '1:1', '9:16');
    expect(vertical.layers.find((layer) => layer.type === 'product')).toMatchObject({ width: 970, height: 1387 });
    expect(vertical.layers.find((layer) => layer.type === 'sticker')).toMatchObject({ width: 260, height: 260, shape: 'circle' });
    expect(original.layers.find((layer) => layer.type === 'product')).toMatchObject({ height: 780 });
    expect(imageTemplateFormSchema.safeParse({ name: 'Oferta', description: '', design: { ...design,
      formats: { ...design.formats, '9:16': vertical } } }).success).toBe(true);
  });

  it('rejeita formatos sem produto, duas camadas de fundo e nomes vazios', () => {
    const design = startImageTemplate('blank');
    const background = createImageLayer('background', '1:1');
    const original = design.formats['1:1'].layers;
    const parse = (name: string, layers: typeof original) => imageTemplateFormSchema.safeParse({ name, description: '',
      design: { version: 1, formats: { '1:1': { layers } } } }).success;
    expect(parse('Modelo', [background])).toBe(false);
    expect(parse('Modelo', [background, ...original, createImageLayer('background', '1:1')])).toBe(false);
    expect(parse('  ', original)).toBe(false);
  });

  it('mantém compatibilidade com modelos salvos antes da regra condicional em produtos', () => {
    const design = startImageTemplate('blank');
    const legacyProduct: Record<string, unknown> = { ...design.formats['1:1'].layers[0] };
    delete legacyProduct.condition;
    const parsed = imageTemplateFormSchema.safeParse({ name: 'Modelo antigo', description: '',
      design: { ...design, formats: { ...design.formats, '1:1': { layers: [legacyProduct] } } } });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const product = parsed.data.design.formats['1:1'].layers[0];
      expect(product.type).toBe('product');
      expect(product.type === 'product' ? product.condition : null).toBeUndefined();
    }
  });

  it('mantém modelos de texto antigos sem as novas opções tipográficas', () => {
    const design = startImageTemplate('blank');
    const legacyText: Record<string, unknown> = { ...createImageLayer('text', '1:1') };
    legacyText.font = 'Arial';
    delete legacyText.underline; delete legacyText.verticalAlign; delete legacyText.lineSpacing;
    delete legacyText.letterSpacing; delete legacyText.textOpacity; delete legacyText.textShadow;
    const parsed = imageTemplateFormSchema.safeParse({ name: 'Modelo antigo', description: '', design: { ...design,
      formats: { ...design.formats, '1:1': { layers: [...design.formats['1:1'].layers, legacyText] } } } });
    expect(parsed.success).toBe(true);
  });

  it('permite escolher qualquer foto já aceita pela galeria do ERP e recusa o próximo índice', () => {
    const design = startImageTemplate('blank');
    const [product] = design.formats['1:1'].layers;
    if (product.type !== 'product') throw new Error('Camada de produto esperada.');
    const withIndex = (imageIndex: number) => imageTemplateFormSchema.safeParse({ name: 'Modelo', description: '',
      design: { ...design, formats: { ...design.formats, '1:1': { layers: [{ ...product, imageIndex }] } } } }).success;
    expect(withIndex(74)).toBe(true);
    expect(withIndex(75)).toBe(false);
  });

  it('leva ao editor todas as fotos permitidas no produto ou na galeria da variação', () => {
    const parentImages = Array.from({ length: 80 }, (_, index) => `https://example.com/parent-${index}.jpg`);
    const parent = mapPreviewProduct(mapProductPreviewSource({ id: '40', images: parentImages }));
    expect(parent.images).toHaveLength(75);
    const variationImages = Array.from({ length: 20 }, (_, index) => `https://example.com/variation-${index}.jpg`);
    const source = mapProductPreviewSource({ id: '41', name: 'Mesa', product_variations: [
      { id: 'v1', product_id: '41', name: 'Azul', active: true, image_url: variationImages.join(',') },
      { id: 'v2', product_id: '41', name: 'Cinza', active: true, image_url: variationImages.join(',') },
    ] });
    expect(mapPreviewProduct(source, 'v1').images).toHaveLength(15);
  });

  it('usa preços do produto e da variação selecionada do ERP', () => {
    expect(parseCatalogPrice('R$ 4.499,00')).toBe(4499);
    expect(parseCatalogPrice('4,499.00 BRL')).toBe(4499);
    expect(parseCatalogPrice('4.49.9,00')).toBeNull();
    const source = mapProductPreviewSource({ id: '30', name: 'Sofá', code: '123', unit_price: 4999, promo_price: 4499,
      images: ['https://example.com/parent.jpg'], product_variations: [{ id: 'v1', product_id: '30', name: 'Sofá Azul', sku: '123-01',
        price: 1200, promo_price: 999, use_parent_price: false, use_parent_promo_price: false, active: true,
        image_url: 'https://example.com/blue.jpg' }, { id: 'v4', product_id: '30', name: 'Sofá Cinza', sku: '123-02', active: true }] });
    expect(mapPreviewProduct(source).fields).toMatchObject({ price: 4999, currentPrice: 4499, salePrice: 4499 });
    expect(mapPreviewProduct(source, 'v1').fields).toMatchObject({ price: 1200, currentPrice: 999, salePrice: 999, retailerId: '123-01' });
    expect(mapPreviewProduct(source, 'v1').images).toEqual(['https://example.com/blue.jpg']);
    const customSku = mapProductPreviewSource({ id: '33', name: 'Produto', code: '123', product_variations: [
      { id: 'v5', product_id: '33', name: 'Variação', sku: 'FAB-AZUL', active: true },
    ] });
    expect(mapPreviewProduct(customSku, 'v5').fields.retailerId).toBe('FAB-AZUL');
    expect(() => mapPreviewProduct(source, 'removida')).toThrow('A variação selecionada mudou');
    const inherited = mapProductPreviewSource({ id: '31', name: 'Mesa', unit_price: 800, promo_price: 700,
      images: ['https://example.com/principal.jpg', 'https://example.com/detalhe.jpg'],
      product_variations: [{ id: 'v2', product_id: '31', name: 'Mesa', active: true, price: 900,
        use_parent_price: true, use_parent_promo_price: true, image_url: 'https://example.com/variacao.jpg' }] });
    expect(mapPreviewProduct(inherited, 'v2').fields).toMatchObject({ price: 800, salePrice: 700, currentPrice: 700 });
    expect(mapPreviewProduct(inherited, 'v2').images).toEqual(['https://example.com/principal.jpg', 'https://example.com/detalhe.jpg']);
    const missing = mapProductPreviewSource({ id: '32', name: 'Sem preço', product_variations: [{ id: 'v3', product_id: '32',
      name: 'Variação', use_parent_price: false, price: null }] });
    expect(mapPreviewProduct(missing, 'v3').fields.currentPrice).toBeUndefined();
    expect(mapPreviewProduct(missing, 'v3').fields.availability).toBeUndefined();
  });

  it('expõe especificações do ERP como campos dinâmicos do produto e da variação', () => {
    const source = mapProductPreviewSource({ id: '34', name: 'Mesa', technical_values: { Material: 'Madeira', Gavetas: 2 },
      technical_specs: { variationDetails: [{ id: 'v6', technicalValues: { Material: 'MDF' } }] },
      product_variations: [{ id: 'v6', product_id: '34', name: 'Mesa MDF', active: true,
        attributes: [{ name: 'Material', value: 'Pinus' }, { name: 'Cor', value: 'Preto' }] }] });
    expect(mapPreviewProduct(source).attributes).toMatchObject({
      attribute_material: { name: 'Material', value: 'Madeira' },
      attribute_gavetas: { name: 'Gavetas', value: 2 },
    });
    expect(mapPreviewProduct(source, 'v6').attributes).toMatchObject({
      attribute_material: { name: 'Material', value: 'MDF' },
      attribute_cor: { name: 'Cor', value: 'Preto' },
    });

    const text = createImageLayer('text', '1:1');
    if (text.type !== 'text') throw new Error('Camada de texto esperada.');
    const conditional = { ...text, condition: { field: 'attribute_material', operator: 'eq', value: 'MDF' } } as const;
    expect(isLayerVisible(conditional, mapPreviewProduct(source, 'v6'))).toBe(true);
    expect(isLayerVisible(conditional, mapPreviewProduct(source))).toBe(false);

    const catalog = { ...createImageLayer('catalog', '1:1'), field: 'attribute_material' };
    const design = startImageTemplate('blank');
    expect(imageTemplateFormSchema.safeParse({ name: 'Campos do ERP', description: '', design: { ...design,
      formats: { ...design.formats, '1:1': { layers: [catalog, ...design.formats['1:1'].layers] } } } }).success).toBe(true);
  });

  it('mostra a camada condicional somente no produto que atende a regra', () => {
    const text = createImageLayer('text', '1:1');
    if (text.type !== 'text') throw new Error('Camada de texto esperada.');
    const layer = { ...text, condition: { field: 'currentPrice', operator: 'lt', value: '1.000,00' } } as const;
    expect(isLayerVisible(layer, mapPreviewProduct(mapProductPreviewSource({ id: '1', unit_price: 899.90 })))).toBe(true);
    expect(isLayerVisible(layer, mapPreviewProduct(mapProductPreviewSource({ id: '2', unit_price: 1499.00 })))).toBe(false);
    expect(isLayerVisible(layer, null)).toBe(false);
  });

  it('permite regras condicionais na camada de forma e mantém formas antigas válidas', () => {
    const design = startImageTemplate('blank');
    const legacySticker: Record<string, unknown> = { ...createImageLayer('sticker', '1:1') };
    delete legacySticker.condition;
    expect(imageTemplateFormSchema.safeParse({ name: 'Modelo antigo', description: '', design: { ...design,
      formats: { ...design.formats, '1:1': { layers: [...design.formats['1:1'].layers, legacySticker] } } } }).success).toBe(true);
    const sticker = { ...createImageLayer('sticker', '1:1'), condition: { field: 'currentPrice', operator: 'lt', value: '1.000,00' } } as const;
    expect(isLayerVisible(sticker, mapPreviewProduct(mapProductPreviewSource({ id: '1', unit_price: 899.90 })))).toBe(true);
    expect(isLayerVisible(sticker, mapPreviewProduct(mapProductPreviewSource({ id: '2', unit_price: 1499.00 })))).toBe(false);
  });

  it('aplica uma regra condicional à camada de produto selecionada', () => {
    const product = { ...createImageLayer('product', '1:1'), condition: { field: 'currentPrice', operator: 'lt', value: '1.000,00' } } as const;
    expect(isLayerVisible(product, mapPreviewProduct(mapProductPreviewSource({ id: '1', unit_price: 899.90 })))).toBe(true);
    expect(isLayerVisible(product, mapPreviewProduct(mapProductPreviewSource({ id: '2', unit_price: 1499.00 })))).toBe(false);
  });
});
