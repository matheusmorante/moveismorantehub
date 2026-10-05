// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { useProductFormSubmit } from './useProductFormSubmit';

const mocks = vi.hoisted(() => ({ saveProduct: vi.fn(async (product: Product) => product.id) }));
vi.mock('@/pages/utils/productService', () => mocks);
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), warn: vi.fn(), success: vi.fn() } }));
afterEach(cleanup);

const complete: Product = {
  id: 'parent', name: 'Armário', description: '', unitPrice: 150, unit: 'UN', itemType: 'product',
  isDraft: true, status: 'draft', active: false, productKind: 'normal', hasVariations: true,
  categoryIds: ['categoria'], mainSupplierId: 'fornecedor', width: 80, height: 180, depth: 50,
  technicalValues: { Cor: 'Azul', 'Material da estrutura': 'Madeira' },
  variations: [{ id: 'v1', sku: '001-01', name: 'Armário Azul', unitPrice: 150, stock: 0,
    active: false, status: 'draft', attributes: [], syncUnitPrice: true }],
};

function renderSubmit(formData: Product) {
  const variations = { setEditingVariationId: vi.fn() };
  const setActiveTab = vi.fn();
  const hook = renderHook(() => useProductFormSubmit({
    formData, setFormData: vi.fn(), product: formData, isRegisteredProduct: false,
    setValidationErrors: vi.fn(), setActiveTab, variations, draft: {},
    setLoading: vi.fn(), setSaveResult: vi.fn(), hasChanged: { current: true }, onClose: vi.fn(),
  }));
  return { ...hook, variations, setActiveTab };
}

describe('conclusão do pai respeita os requisitos de cada variação', () => {
  it('bloqueia a conclusão quando uma variação não tem dimensão obrigatória', async () => {
    const { result, variations, setActiveTab } = renderSubmit({ ...complete, height: 0 });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });
    expect(mocks.saveProduct).not.toHaveBeenCalled();
    expect(variations.setEditingVariationId).toHaveBeenCalledWith('v1');
    expect(setActiveTab).toHaveBeenCalledWith('variacoes');
  });
  it('bloqueia uma variação sem preço próprio mesmo com outra variação válida', async () => {
    const invalid = { ...complete.variations![0], id: 'v2', sku: '001-02', unitPrice: 0, syncUnitPrice: false };
    const { result, variations } = renderSubmit({ ...complete, variations: [...complete.variations!, invalid] });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(false); });
    expect(mocks.saveProduct).not.toHaveBeenCalled();
    expect(variations.setEditingVariationId).toHaveBeenCalledWith('v2');
  });
  it('conclui pai e variação somente após os requisitos passarem', async () => {
    const { result } = renderSubmit(complete);
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({ isDraft: false, status: 'hidden',
      variations: [expect.objectContaining({ status: 'hidden', active: true })] }));
  });
  it('persiste as dimensões técnicas da variação que validou durante a conclusão do pai', async () => {
    const { result } = renderSubmit({ ...complete, width: 0, height: 0, depth: 0,
      variations: [{ ...complete.variations![0], technicalValues: { Largura: '80', Altura: '180', Profundidade: '50' } }] });
    await act(async () => { expect(await result.current.handleSubmit(false)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({
      variations: [expect.objectContaining({ width: 80, height: 180, depth: 50, status: 'hidden' })],
    }));
  });
  it('salvar rascunho preserva campos incompletos e o status individual das variações', async () => {
    const { result } = renderSubmit({ ...complete, height: 0, variations: [
      complete.variations![0], { ...complete.variations![0], id: 'v2', sku: '001-02', status: 'hidden' },
    ] });
    await act(async () => { expect(await result.current.handleSubmit(false, true)).toBe(true); });
    expect(mocks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({ isDraft: true, status: 'draft',
      variations: [expect.objectContaining({ status: 'draft', active: false }), expect.objectContaining({ status: 'hidden', active: false })] }));
  });
});
