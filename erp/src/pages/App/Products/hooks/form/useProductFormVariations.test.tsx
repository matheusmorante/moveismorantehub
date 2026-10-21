// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { useProductFormVariations } from './useProductFormVariations';

vi.mock('@/pages/utils/productService', () => ({
  generateVariationSku: (_: string, variations: unknown[], index = 0) => `001-${variations.length + index + 1}`,
  checkProductHasMoves: vi.fn(async () => false),
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
afterEach(cleanup);

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

  it('preserva os campos da variação simples existente ao trocar o modo', () => {
    const variation = {
      id: 'saved-variation', sku: 'SAVED-1', name: 'Armário Mogno', stock: 7,
      unitPrice: 125, active: true, attributes: [{ name: 'Madeira', value: 'Mogno' }],
      images: ['https://img.test/mogno.jpg'], syncUnitPrice: false,
    };
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState<Partial<Product>>({
        id: 'parent', name: 'Armário', status: 'hidden', variations: [variation], hasVariations: false,
      });
      return { ...useProductFormVariations(formData, setFormData, true, true), formData };
    });
    act(() => result.current.setProductMode(true));
    act(() => result.current.setProductMode(false));

    expect(result.current.formData.variations?.[0]).toEqual(variation);
    expect(result.current.formData.hasVariations).toBe(false);
  });
});
