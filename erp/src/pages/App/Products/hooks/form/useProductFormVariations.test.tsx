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
