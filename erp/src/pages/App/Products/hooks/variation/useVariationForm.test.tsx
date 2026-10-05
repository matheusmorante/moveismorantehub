// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product, Variation } from '@/pages/types/product.type';
import { useVariationForm } from './useVariationForm';

const mocks = vi.hoisted(() => ({ saveProduct: vi.fn(async () => 'parent'), saveVariation: vi.fn() }));
vi.mock('@/pages/utils/productService', () => ({ ...mocks, generateVariationSku: () => '001-01', parseVariationImages: (_: any, images: any) => images || [] }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), warn: vi.fn(), success: vi.fn() } }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ ecommerceSupabase: {
  from: () => {
    const query: any = { select: () => query, eq: () => query, order: () => query,
      then: (resolve: (response: any) => any) => Promise.resolve({ data: [], error: null }).then(resolve) };
    return query;
  },
} }));

const variation: Variation = { id: 'variation-1', name: 'Armário', title: 'Armário', sku: '001-01',
  stock: 0, unitPrice: 0, active: false, status: 'draft', attributes: [], syncWidth: false, syncHeight: false,
  syncDepth: false, syncWeight: false, syncDescription: false, syncUnitPrice: false, syncCostPrice: false };
const parent: Product = { id: 'parent', name: 'Armário', description: '', unitPrice: 0, unit: 'UN',
  itemType: 'product', active: false, isDraft: true, status: 'draft', variations: [variation] };

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('integração do formulário da variação com o rascunho', () => {
  it('Concluir não permite cadastrar uma variação incompleta, mesmo com o pai rascunho', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose,
      parentProduct: parent, variation, onSave, onDraftSave: vi.fn(async () => true) }));
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(result.current.formData?.status).toBe('draft');
    expect(result.current.activeTab).toBe('tecnico');
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Concluir valida os requisitos e salva status concluído sem concluir o produto pai', async () => {
    const complete: Variation = { ...variation, width: 80, height: 180, depth: 50, unitPrice: 120,
      technicalValues: { Cor: 'Azul', 'Material da estrutura': 'Madeira' }, syncFiscal: false, fiscal: { ncm: '94035000' } };
    const completeParent = { ...parent, categoryIds: ['categoria'], mainSupplierId: 'fornecedor', variations: [complete] };
    const onDraftSave = vi.fn(async () => true);
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose,
      parentProduct: completeParent, variation: complete, onSave, onDraftSave }));
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(onDraftSave).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'hidden', active: false,
      syncFiscal: false, fiscal: { ncm: '94035000' } }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: 'hidden' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(completeParent.status).toBe('draft');
  });

  it('uma alteração em variação concluída volta ao rascunho e falha de conclusão não fecha', async () => {
    const complete = { ...variation, status: 'hidden' as const, width: 80, height: 180, depth: 50,
      unitPrice: 120, technicalValues: { Cor: 'Azul', 'Material da estrutura': 'Madeira' } };
    const completeParent = { ...parent, categoryIds: ['categoria'], mainSupplierId: 'fornecedor', variations: [complete] };
    const onClose = vi.fn();
    const onSave = vi.fn();
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose,
      parentProduct: completeParent, variation: complete, onSave, onDraftSave: vi.fn(async () => false) }));
    await act(async () => {});
    act(() => result.current.handleChange('barcode', '789'));
    expect(result.current.formData?.status).toBe('draft');
    await act(async () => { await result.current.handleSubmit({ preventDefault() {} } as React.FormEvent); });
    expect(onClose).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.formData?.status).toBe('draft');
  });
  it('entrega mudanças ao pai sem fechar e salva antes de fechar mesmo incompleto', async () => {
    const onClose = vi.fn();
    const onDraftChange = vi.fn();
    const onDraftSave = vi.fn(async () => true);
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose, parentProduct: parent,
      variation, onSave: vi.fn(), onDraftChange, onDraftSave }));
    await act(async () => {});
    act(() => result.current.setFormData((current) => ({ ...current!, technicalValues: { Altura: '' }, images: ['foto'], syncHeight: true })));
    expect(onDraftChange).toHaveBeenLastCalledWith(expect.objectContaining({ technicalValues: { Altura: '' }, images: ['foto'], syncHeight: true }));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleClose(); });
    expect(onDraftSave).toHaveBeenLastCalledWith(expect.objectContaining({ technicalValues: { Altura: '' }, images: ['foto'] }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.saveVariation).not.toHaveBeenCalled();
  });

  it('uma falha de persistência mantém o modal aberto e permite recuperar', async () => {
    const onClose = vi.fn();
    const onDraftSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose, parentProduct: parent, variation, onDraftSave }));
    await act(async () => {});
    act(() => result.current.handleChange('description', 'Descrição pendente'));
    await act(async () => { await result.current.handleClose(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.autoSaveStatus).toBe('error');
    await act(async () => { await result.current.handleClose(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('editar pela listagem também salva o produto completo, mantendo a ordem das variações', async () => {
    const sibling = { ...variation, id: 'variation-2', sku: '001-02', name: 'Armário Verde' };
    const parentWithSibling = { ...parent, variations: [variation, sibling] };
    const { result } = renderHook(() => useVariationForm({ isOpen: true, onClose: vi.fn(), parentProduct: parentWithSibling, variation }));
    await act(async () => {});
    act(() => result.current.handleChange('barcode', '789'));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(mocks.saveProduct).toHaveBeenLastCalledWith(expect.objectContaining({
      isDraft: true, variations: [expect.objectContaining({ id: variation.id, barcode: '789' }), sibling],
    }));
  });
});
