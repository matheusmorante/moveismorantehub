// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { inheritSimpleProductVariationFromParent } from '../../../../../../../shared-utils/simpleProductVariationInheritance';
import { useProductFormVariations } from './useProductFormVariations';

vi.mock('@/pages/utils/productService', () => ({
  generateVariationSku: (_: string, variations: unknown[], index = 0) => `001-${variations.length + index + 1}`,
  checkProductHasMoves: vi.fn(async () => false),
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
afterEach(cleanup);

describe('inheritencia de variação simples', () => {
	const parent = {
		name: 'Armário',
		title: 'Armário de Madeira',
		marketplaceTitle: 'Armário MDF',
		unitPrice: 250,
		promoPrice: 225,
		costPrice: 140,
		description: 'Descrição do pai',
		condition: 'novo',
		fiscal: { ncm: '94035000' },
		width: 80,
		height: 180,
		depth: 45,
		weight: 36,
		images: ['parent-cover.jpg', 'parent-side.jpg'],
		stock: 12,
	};

	const survivingVariation = {
		id: 'variation-uuid',
		sku: 'ARM-MOGNO-01',
		name: 'Armário Mogno',
		stock: 7,
		unitPrice: 300,
		attributes: [{ name: 'Madeira', value: 'Mogno' }],
		images: ['variation.jpg'],
		syncUnitPrice: false,
		syncDescription: false,
		syncNcm: false,
	};

	it('reativa a herança sem alterar a identidade, o saldo ou os atributos da variação', () => {
		const inherited = inheritSimpleProductVariationFromParent(
			parent,
			survivingVariation,
			{ preserveVariationStock: true, preserveVariationAttributes: true },
		);

		expect(inherited).toMatchObject({
			id: 'variation-uuid',
			sku: 'ARM-MOGNO-01',
			name: 'Armário',
			title: 'Armário de Madeira',
			marketplaceTitle: 'Armário MDF',
			stock: 7,
			unitPrice: 250,
			price: 250,
			promoPrice: 225,
			costPrice: 140,
			description: 'Descrição do pai',
			width: 80,
			height: 180,
			depth: 45,
			weight: 36,
			attributes: [{ name: 'Madeira', value: 'Mogno' }],
			images: ['parent-cover.jpg', 'parent-side.jpg'],
			syncUnitPrice: true,
			syncPromoPrice: true,
			syncDescription: true,
			syncFiscal: true,
			syncNcm: true,
		});
		expect(survivingVariation).toMatchObject({
			stock: 7,
			unitPrice: 300,
			syncUnitPrice: false,
			attributes: [{ name: 'Madeira', value: 'Mogno' }],
			images: ['variation.jpg'],
		});
	});

	it('mantém os padrões de estoque e atributos usados ao criar produto simples', () => {
		const inherited = inheritSimpleProductVariationFromParent(parent, {
			id: 'draft-variation',
			sku: 'ARM-01',
			stock: 0,
			attributes: [{ name: 'Madeira', value: 'Mogno' }],
		});

		expect(inherited).toMatchObject({
			stock: 12,
			attributes: [],
			images: ['parent-cover.jpg', 'parent-side.jpg'],
			syncUnitPrice: true,
		});
	});
});

function renderVariations() {
  return renderHook(() => {
    const [formData, setFormData] = useState<Partial<Product>>({ id: 'parent', name: 'Armário', status: 'draft', variations: [] });
    return { ...useProductFormVariations(formData, setFormData), formData };
  });
}

describe('status inicial das variações', () => {
  it('variação nova começa como rascunho, inativa e sem estoque inferido', () => {
    const { result } = renderVariations();
    act(() => result.current.addVariation());
    expect(result.current.formData.variations?.[0]).toMatchObject({ status: 'draft', active: false, stock: 0 });
    expect(result.current.formData.variations?.[0]).not.toHaveProperty('initialStock');
  });
  it('a geração em lote também começa com todas as variações em rascunho', () => {
    const { result } = renderVariations();
    act(() => result.current.generateBulkVariations([{ name: 'Cor', values: ['Azul', 'Verde'], showName: true }]));
    expect(result.current.formData.variations).toHaveLength(2);
    expect(result.current.formData.variations?.every((variation) => variation.status === 'draft' && !variation.active && variation.stock === 0)).toBe(true);
  });
});

describe('modo simples e modo com variações', () => {
  it('permite alternar para múltiplas variações e volta automaticamente a simples ao restar uma', () => {
    const { result } = renderVariations();
    act(() => result.current.addVariation());
    const firstId = result.current.formData.variations![0].id;

    act(() => result.current.setProductMode(true));
    expect(result.current.formData.hasVariations).toBe(true);

    act(() => result.current.addVariation());
    const secondId = result.current.formData.variations![1].id;
    act(() => result.current.removeVariation(secondId));

    expect(result.current.formData.variations).toHaveLength(1);
    expect(result.current.formData.variations?.[0].id).toBe(firstId);
    expect(result.current.formData.hasVariations).toBe(false);
  });

  it('reativa a galeria herdada sem alterar os demais dados da variação existente', () => {
    const parentImages = ['parent-cover.jpg', 'parent-side.jpg'];
    const variation = {
      id: 'saved-variation', sku: 'SAVED-1', name: 'Armário Mogno', stock: 7,
      unitPrice: 125, active: true, attributes: [{ name: 'Madeira', value: 'Mogno' }],
      images: ['https://img.test/mogno.jpg'], syncUnitPrice: false,
    };
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>({
        id: 'parent', name: 'Armário', status: 'hidden', images: parentImages,
        variations: [variation], hasVariations: false,
      });
      return { ...useProductFormVariations(formData, setFormData, true, true), formData };
    });
    act(() => result.current.setProductMode(true));
    act(() => result.current.setProductMode(false));

    expect(result.current.formData.variations?.[0]).toEqual({
      ...variation,
      images: parentImages,
    });
    expect(result.current.formData.hasVariations).toBe(false);
  });

  it('reativa a herança ao remover uma variação de produto existente sem alterar saldo nem atributos', () => {
    const attributes = [{ name: 'Madeira', value: 'Mogno', showName: false }];
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>({
        id: 'parent',
        name: 'Armário',
        title: 'Armário de Madeira',
        marketplaceTitle: 'Armário MDF',
        unitPrice: 250,
        promoPrice: 225,
        costPrice: 140,
        description: 'Descrição do pai',
        width: 80,
        height: 180,
        depth: 45,
        weight: 36,
        images: ['parent-cover.jpg'],
        stock: 12,
        hasVariations: true,
        variations: [
          {
            id: 'survivor-uuid',
            sku: 'ARM-MOGNO-01',
            name: 'Armário Mogno',
            stock: 7,
            unitPrice: 300,
            promoPrice: 280,
            costPrice: 160,
            description: 'Descrição própria',
            width: 90,
            height: 190,
            depth: 50,
            weight: 40,
            active: true,
            attributes,
            images: ['variation.jpg'],
            syncUnitPrice: false,
            syncPromoPrice: false,
            syncDescription: false,
            syncWidth: false,
          },
          {
            id: 'removed-uuid',
            sku: 'ARM-BRANCO-01',
            name: 'Armário Branco',
            stock: 5,
            unitPrice: 250,
            active: true,
            attributes: [{ name: 'Madeira', value: 'Branco' }],
          },
        ],
      });
      return { ...useProductFormVariations(formData, setFormData, false, true), formData };
    });

    act(() => result.current.removeVariation('removed-uuid'));

    expect(result.current.formData.hasVariations).toBe(false);
    expect(result.current.formData.stock).toBe(12);
    expect(result.current.formData.variations).toHaveLength(1);
    expect(result.current.formData.variations?.[0]).toMatchObject({
      id: 'survivor-uuid',
      sku: 'ARM-MOGNO-01',
      name: 'Armário',
      stock: 7,
      unitPrice: 250,
      promoPrice: 225,
      costPrice: 140,
      description: 'Descrição do pai',
      width: 80,
      height: 180,
      depth: 45,
      weight: 36,
      attributes,
      images: ['parent-cover.jpg'],
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncDescription: true,
      syncWidth: true,
    });
  });
});
