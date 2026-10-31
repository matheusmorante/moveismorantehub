// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/orderEditPayload', () => ({
  buildUpdatedOrder: ({ formState }: any) => formState.currentOrder,
}));

import { useOrderEditActions } from './useOrderEditActions';

const item = { productId: 'product-a', variationId: 'variation-a', quantity: 2, unitPrice: 10 };
const existing = { id: 'order-1', status: 'scheduled', items: [item] } as any;

function setup(items: any[]) {
  const saveWithFiscalAudit = vi.fn(async () => 'order-1');
  const setPendingUpdate = vi.fn();
  const formState = { currentOrder: { ...existing, items }, items, currentStep: 1 } as any;
  const formActions = { validateOrder: () => ({}), setErrors: vi.fn(), jumpToStep: vi.fn() } as any;
  const hook = renderHook(() => useOrderEditActions({
    effectiveOrder: existing, formState, formActions, saveWithFiscalAudit,
    setPendingUpdate, onSaveSuccess: vi.fn(), onClose: vi.fn(),
  }));
  return { ...hook, saveWithFiscalAudit, setPendingUpdate };
}

describe('salvar edição de venda com estoque já movimentado', () => {
  it('salva mudança somente de preço sem solicitar confirmação de estoque', async () => {
    const test = setup([{ ...item, unitPrice: 15 }]);
    expect(test.saveWithFiscalAudit).not.toHaveBeenCalled();
    await act(async () => { await test.result.current.handleUpdate(); });
    expect(test.setPendingUpdate).not.toHaveBeenCalled();
    expect(test.saveWithFiscalAudit).toHaveBeenCalledOnce();
  });

  it.each([
    ['acrescentar unidades', [{ ...item, quantity: 5 }]],
    ['reduzir unidades', [{ ...item, quantity: 1 }]],
    ['trocar o produto', [{ ...item, productId: 'product-b', variationId: 'variation-b' }]],
    ['acrescentar item', [item, { ...item, productId: 'product-b' }]],
  ])('%s exige confirmação antes de salvar', async (_name, items) => {
    const test = setup(items);
    await act(async () => { await test.result.current.handleUpdate(); });
    expect(test.setPendingUpdate).toHaveBeenCalledOnce();
    expect(test.saveWithFiscalAudit).not.toHaveBeenCalled();
  });
});
