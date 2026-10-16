// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductFormModal } from './useProductFormModal';
import type { Product, Variation } from '@/pages/types/product.type';

const mocks = vi.hoisted(() => ({ saveVariation: vi.fn(), draft: vi.fn(), editing: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/productService', () => ({ saveVariation: mocks.saveVariation, physicalDeleteVariation: vi.fn() }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: async () => ({ categories: [] }) }));
vi.mock('@/pages/utils/personService', () => ({ subscribeToPeople: () => () => {} }));
vi.mock('./useProductFormAi', () => ({ useProductFormAi: () => ({}) }));
vi.mock('../fiscal/useProductJevClassification', () => ({ useProductJevClassification: () => ({}) }));
vi.mock('./useProductFormPricing', () => ({ useProductFormPricing: () => ({}) }));
vi.mock('./useProductFormImages', () => ({ useProductFormImages: () => ({}) }));
vi.mock('./useProductFormSync', () => ({ useProductFormSync: () => {} }));
vi.mock('./useProductFormLoad', () => ({ useProductFormLoad: () => {} }));
vi.mock('./useProductFormSubmit', () => ({ useProductFormSubmit: () => ({ handleSubmit: vi.fn() }) }));
vi.mock('./useProductFormDraft', () => ({ useProductFormDraft: () => ({ autoSaveDraft: mocks.draft, autoSaveStatus: 'idle' }) }));
vi.mock('./useProductFormVariations', async () => {
  const { useRef } = await import('react');
  return { useProductFormVariations: () => ({ pendingNewVariationIdRef: useRef<string | null>(null), setEditingVariationId: mocks.editing, editingVariationId: null }) };
});
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn() } }));

const variation: Variation = { id: 'variation', name: 'Armário azul', sku: 'SKU-1', stock: 0, unitPrice: 120, active: true, status: 'hidden', attributes: [], width: 80, height: 180, depth: 50 };
const product = (draft: boolean): Product => ({ id: 'parent', name: 'Armário', unitPrice: 120, description: '', unit: 'UN', itemType: 'product', active: !draft, status: draft ? 'draft' : 'hidden', isDraft: draft, variations: [variation], technicalValues: { Cor: 'Azul', Marca: 'Morante', Modelo: 'Padrão', 'Material da estrutura': 'Madeira' } });
const mount = (draft = false) => {
  const parent = product(draft);
  return renderHook(() => useProductFormModal({ isOpen: true, onClose: vi.fn(), product: parent, initialData: parent }));
};
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.saveVariation.mockResolvedValue(undefined); mocks.draft.mockResolvedValue(true); });

describe('proprietário que recebe a variação concluída', () => {
  it.each([false, true])('bloqueia números inválidos antes da operação; rascunho=%s', async (draft) => {
    const { result } = mount(draft); let saved: boolean | undefined;
    await act(async () => { saved = await result.current.handleSaveVariation({ ...variation, unitPrice: -1 }); });
    expect(saved).toBe(false); expect(mocks.saveVariation).not.toHaveBeenCalled(); expect(mocks.draft).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalled();
  });
  it('preserva metadata e atualiza a variação no agregado após persistir', async () => {
    const { result } = mount(); const next = { ...variation, unitPrice: 150, fiscal: { ncm: '94035000' } };
    await act(async () => { expect(await result.current.handleSaveVariation(next)).toBe(true); });
    expect(mocks.saveVariation).toHaveBeenCalledWith('parent', next); expect(mocks.draft).not.toHaveBeenCalled();
    expect(result.current.formData.variations?.[0]).toEqual(next); expect(mocks.editing).toHaveBeenCalledWith(null);
  });
  it('encaminha o agregado ao autosave quando o produto ainda é rascunho', async () => {
    const { result } = mount(true); const next = { ...variation, unitPrice: 150 };
    await act(async () => { expect(await result.current.handleSaveVariation(next)).toBe(true); });
    expect(mocks.draft).toHaveBeenCalledWith(expect.objectContaining({ id: 'parent', isDraft: true, variations: [next] }));
    expect(mocks.saveVariation).not.toHaveBeenCalled(); expect(result.current.formData.variations?.[0]).toEqual(next);
  });
  it('rejeita SKU já utilizado por outra variação', async () => {
    const { result } = mount();
    await act(async () => { expect(await result.current.handleSaveVariation({ ...variation, id: 'other', sku: ' sku-1 ' })).toBe(false); });
    expect(mocks.saveVariation).not.toHaveBeenCalled(); expect(mocks.draft).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('já está em uso'));
  });
  it.each([false, true])('protege a operação pendente e permite retomar após falha; rascunho=%s', async (draft) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    const operation = draft ? mocks.draft : mocks.saveVariation;
    operation.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const { result } = mount(draft); let first!: Promise<boolean>;
    await act(async () => { first = result.current.handleSaveVariation({ ...variation, unitPrice: 150 }); });
    await waitFor(() => expect(operation).toHaveBeenCalledTimes(1));
    await act(async () => { expect(await result.current.handleSaveVariation({ ...variation, unitPrice: 160 })).toBe(false); });
    expect(operation).toHaveBeenCalledTimes(1); expect(result.current.formData.variations?.[0].unitPrice).toBe(120);
    await act(async () => { fail(new Error('Falha simulada')); expect(await first).toBe(false); });
    await act(async () => { expect(await result.current.handleSaveVariation({ ...variation, unitPrice: 170 })).toBe(true); });
    expect(operation).toHaveBeenCalledTimes(2); expect(result.current.formData.variations?.[0].unitPrice).toBe(170);
  });
  it('ao fechar modal de variação pendente no x, nunca deixa o produto sem variações', () => {
    const parent = product(true);
    const pendingId = 'pending-new-var';
    let pendingRef: { current: string | null } | undefined;
    const { result } = renderHook(() => {
      const hook = useProductFormModal({ isOpen: true, onClose: vi.fn(), product: parent, initialData: parent });
      pendingRef = hook.variations.pendingNewVariationIdRef;
      return hook;
    });

    act(() => {
      if (pendingRef) pendingRef.current = pendingId;
      result.current.setFormData((prev) => ({
        ...prev,
        variations: [{ id: pendingId, name: 'Variação Pendente', sku: 'PEND-01', stock: 0, unitPrice: 100 }],
      }));
    });

    act(() => {
      result.current.handleCloseVariationModal();
    });

    expect(mocks.editing).toHaveBeenCalledWith(null);
    expect(pendingRef?.current).toBeNull();
    expect(result.current.formData.variations?.length).toBeGreaterThanOrEqual(1);
    expect(result.current.formData.variations?.[0].id).not.toBe(pendingId);
  });
});
