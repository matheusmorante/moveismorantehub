// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Variation } from '@/pages/types/product.type';
import { useVariationDraftAutoSave } from './useVariationDraftAutoSave';

const initial: Variation = {
  id: 'variation-1', sku: '001-01', name: 'Armário', stock: 0,
  unitPrice: 0, active: false, attributes: [],
};

function renderDraft(save = vi.fn(async () => true), isDraft = true) {
  const onChange = vi.fn();
  const hook = renderHook(() => {
    const [variation, setVariation] = useState(initial);
    return { ...useVariationDraftAutoSave({ isOpen: true, isDraft, variation, save, onChange }), setVariation };
  });
  return { ...hook, save, onChange };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('rascunho da variação', () => {
  it('salva o objeto completo, incluindo campos aninhados e campos limpos, sem concluir', async () => {
    const { result, save, onChange } = renderDraft();
    const edited: Variation = {
      ...initial, barcode: '7890000000000', name: 'Armário Manual', title: '',
      description: 'Descrição própria', unitPrice: 850, promoPrice: 0, costPrice: 430,
      minStock: 2, weight: 22, width: 80, height: 180, depth: 50,
      pkgWidth: 85, pkgHeight: 185, pkgDepth: 55, freightCost: 35, freightType: 'fixed',
      ipiType: 'percentage', ipiPercent: 3, finalPurchasePrice: 477.9,
      syncDescription: false, syncUnitPrice: false, syncCostPrice: false,
      syncWidth: false, syncHeight: true, syncDepth: false, syncWeight: false,
      syncPromoPrice: false, syncFiscal: false, syncIpi: false, syncFreight: false,
      hideAttributeNames: true, condition: 'usado', leadTime: 3, avgMonthlySales: 5,
      classification: 'Q2', images: ['https://example.test/foto.jpg'],
      attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
      technicalValues: { Largura: '80', Montagem: false }, fiscal: { ncm: '94035000' },
      comboItems: [{ productId: 'component', quantity: 2, description: 'Peça', unitPrice: 10, stock: 0 }],
    };
    act(() => result.current.setVariation(edited));
    expect(onChange).toHaveBeenLastCalledWith(edited);
    expect(save).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(edited);
    expect(result.current.status).toBe('saved');
  });

  it('fecha com a última edição ainda antes do debounce, e não grava de novo depois', async () => {
    const { result, save } = renderDraft();
    act(() => result.current.setVariation({ ...initial, images: [] , technicalValues: { Cor: 'Azul' } }));
    await act(async () => { expect(await result.current.flush()).toBe(true); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('serializa edições durante uma gravação e mantém a última versão', async () => {
    let finish!: (value: boolean) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
    const { result } = renderDraft(save);
    act(() => result.current.setVariation({ ...initial, unitPrice: 100 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    act(() => result.current.setVariation({ ...initial, unitPrice: 200 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.lastCall?.[0].unitPrice).toBe(200);
    expect(result.current.status).toBe('saved');
  });

  it('mantém erro e permite tentar novamente os mesmos dados sem descartá-los', async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { result } = renderDraft(save);
    act(() => result.current.setVariation({ ...initial, description: 'Pendente' }));
    await act(async () => { expect(await result.current.flush()).toBe(false); });
    expect(result.current.status).toBe('error');
    await act(async () => { expect(await result.current.flush()).toBe(true); });
    expect(save.mock.calls[1][0]).toEqual(save.mock.calls[0][0]);
    expect(result.current.status).toBe('saved');
  });

  it('não grava automaticamente variações de produtos concluídos', async () => {
    const { result, save, onChange } = renderDraft(undefined, false);
    act(() => result.current.setVariation({ ...initial, description: 'Manual' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(save).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('concluir durante uma gravação persiste a versão validada por último', async () => {
    let finish!: (value: boolean) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
    const { result } = renderDraft(save);
    act(() => result.current.setVariation({ ...initial, status: 'draft', unitPrice: 100 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    const complete = { ...initial, status: 'hidden' as const, unitPrice: 100 };
    let completed!: Promise<boolean>;
    act(() => { completed = result.current.flush(complete); });
    await act(async () => { finish(true); expect(await completed).toBe(true); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.lastCall?.[0]).toEqual(complete);
  });
});
