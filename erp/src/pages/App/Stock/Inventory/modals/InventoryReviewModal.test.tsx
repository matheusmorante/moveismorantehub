// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditItem } from '../types/inventoryAudit.types';

const mocks = vi.hoisted(() => ({ from: vi.fn(), range: vi.fn(), in: vi.fn(), gte: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.from },
}));

import { InventoryReviewModal } from './InventoryReviewModal';

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  mocks.range.mockResolvedValue({ data: [], error: null });
  mocks.from.mockImplementation(() => {
    const query = { select: vi.fn(() => query), in: mocks.in, gte: mocks.gte, order: vi.fn(() => query), range: mocks.range };
    mocks.in.mockReturnValue(query); mocks.gte.mockReturnValue(query);
    return query;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

const item: AuditItem = { id: 'item-1', key: 'p1-v1', productId: 'p1', variationId: 'v1', name: 'Produto',
  supplierNames: '', assignedSupplier: '', systemStock: 4, physicalCount: 5, unit: 'UN', countedAt: '2026-09-25T10:01:00Z' };
const startDate = '2026-09-25T10:00:00Z';
const move = (type: string, quantity: number | string, extra = {}) => ({ product_id: 'p1', variation_id: 'v1', type, quantity,
  observation: null, status: 'effective', ...extra });
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Concluir Inventário/i }));
async function ready() { await waitFor(() => expect(screen.queryByText(/Reconciliando movimentações/)).toBeNull()); }
function setup(items = [item], onConfirm = vi.fn()) {
  const onCancel = vi.fn();
  const view = render(<InventoryReviewModal items={items} startDate={startDate} onConfirm={onConfirm} onCancel={onCancel} />);
  return { ...view, onConfirm, onCancel };
}

describe('revisão de inventário offline', () => {
  it('permite congelar todas as contagens usando a estimativa local', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const onConfirm = vi.fn();
    render(
      <InventoryReviewModal
        startDate="2026-09-25T10:00:00Z"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        items={[
          {
            id: 'item-1',
            key: 'p1-v1',
            productId: 'p1',
            variationId: 'v1',
            name: 'Produto',
            supplierNames: '',
            assignedSupplier: '',
            systemStock: 4,
            physicalCount: 4,
            countedAt: '2026-09-25T10:01:00Z',
            unit: 'UN',
          },
        ]}
      />
    );
    await waitFor(() => expect(screen.getByText(/estimativas locais/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Concluir Inventário/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(onConfirm.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        variationId: 'v1',
        physicalCount: 4,
        countedAt: '2026-09-25T10:01:00Z',
        difference: 0,
      }),
    ]);
  });
});

describe('inventory review with real RHF/resolver', () => {
  it('reconciles parsed source and confirms counted rows, including unchanged counts', async () => {
    mocks.range.mockResolvedValue({ data: [move('entry', '3'), move('exit', 1), move('entry', 20, { status: 'reversed' }),
      move('entry', 30, { observation: '{"inventoryAudit":true}' }), move('adjustment', 100)], error: null });
    const source = [item, { ...item, id: 'item-2', key: 'p2', productId: 'p2', variationId: undefined, physicalCount: null }];
    const view = setup(source); await ready(); submit();
    await waitFor(() => expect(view.onConfirm).toHaveBeenCalledOnce());
    expect(mocks.in).toHaveBeenCalledWith('product_id', ['p1', 'p2']); expect(mocks.gte).toHaveBeenCalledWith('date', startDate);
    expect(view.onConfirm).toHaveBeenCalledWith([{ ...item, reconciledExpected: 6, difference: -1 }]);
    expect(view.onConfirm.mock.calls[0][0][0]).not.toBe(item);
    expect(screen.getByText(/permanecerão com o saldo intacto/)).toBeTruthy();
    submit(); expect(view.onConfirm).toHaveBeenCalledOnce();
  });

  it.each([
    { field: 'systemStock', value: Number.NaN }, { field: 'physicalCount', value: -1 }, { field: 'productId', value: '' },
  ])('blocks invalid source $field before any query or callback', async ({ field, value }) => {
    const view = setup([{ ...item, [field]: value }]); await ready();
    expect(screen.getByRole('alert').textContent).toContain('Revise os dados'); submit();
    expect(mocks.from).not.toHaveBeenCalled(); expect(view.onConfirm).not.toHaveBeenCalled();
  });

  it('blocks an invalid start date and never fabricates an item identity', async () => {
    const onConfirm = vi.fn();
    render(<InventoryReviewModal items={[{ ...item, id: '' }]} startDate="not-a-date" onCancel={vi.fn()} onConfirm={onConfirm} />);
    await ready(); expect(screen.getByRole('alert')).toBeTruthy(); submit();
    expect(mocks.from).not.toHaveBeenCalled(); expect(onConfirm).not.toHaveBeenCalled();
  });

  it('preserves an uncounted manual placeholder without querying or submitting its empty product identity', async () => {
    const placeholder = { ...item, id: 'blank', key: 'blank', productId: '', variationId: undefined, name: '', physicalCount: null };
    const view = setup([item, placeholder]); await ready();
    expect(screen.queryByRole('alert')).toBeNull(); expect(mocks.in).toHaveBeenCalledWith('product_id', ['p1']);
    expect(screen.getByText(/permanecerão com o saldo intacto/)).toBeTruthy(); submit();
    await waitFor(() => expect(view.onConfirm).toHaveBeenCalledWith([{ ...item, reconciledExpected: 4, difference: 1 }]));
  });

  it('blocks malformed remote quantities instead of accepting a local fallback', async () => {
    mocks.range.mockResolvedValue({ data: [move('entry', 'Infinity')], error: null });
    const view = setup(); await ready();
    expect(screen.getByRole('alert').textContent).toContain('saldos inválidos'); submit();
    expect(view.onConfirm).not.toHaveBeenCalled(); expect(screen.queryByText(/estimativas locais/)).toBeNull();
  });

  it('preserves pagination, ignores adjustments and uses exit moves with legacy observations', async () => {
    mocks.range.mockResolvedValueOnce({ data: Array.from({ length: 200 }, () => move('entry', 1)), error: null })
      .mockResolvedValueOnce({ data: [move('exit', 2, { observation: 'legado' })], error: null });
    const view = setup(); await ready(); submit();
    await waitFor(() => expect(view.onConfirm).toHaveBeenCalledOnce());
    expect(mocks.range.mock.calls).toEqual([[0, 199], [200, 399]]);
    expect(view.onConfirm).toHaveBeenCalledWith([expect.objectContaining({ reconciledExpected: 202, difference: -197 })]);
  });

  it('discards old query responses and never fetches their next page after switching owners', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.range.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
    const view = setup(); await waitFor(() => expect(mocks.range).toHaveBeenCalledOnce());
    const next = { ...item, id: 'item-new', productId: 'p2', key: 'p2-v1', physicalCount: 4 };
    view.rerender(<InventoryReviewModal items={[next]} startDate={startDate} onConfirm={view.onConfirm} onCancel={view.onCancel} />);
    await ready();
    await act(async () => { resolveOld({ data: Array.from({ length: 200 }, () => move('entry', 1)), error: null }); });
    submit(); await waitFor(() => expect(view.onConfirm).toHaveBeenCalledOnce());
    expect(mocks.range).toHaveBeenCalledTimes(2);
    expect(view.onConfirm).toHaveBeenCalledWith([{ ...next, reconciledExpected: 4, difference: 0 }]);
  });

  it('uses a visible local estimate after a query timeout and stops late pagination', async () => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void;
    mocks.range.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = setup(); await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByText(/estimativas locais/)).toBeTruthy();
    await act(async () => { finish({ data: Array.from({ length: 200 }, () => move('entry', 1)), error: null }); });
    await act(async () => { submit(); });
    expect(mocks.range).toHaveBeenCalledOnce();
    expect(view.onConfirm).toHaveBeenCalledWith([{ ...item, reconciledExpected: 4, difference: 1 }]);
  });

  it('retains manual confirmation of a local estimate after a transport error', async () => {
    mocks.range.mockResolvedValueOnce({ data: null, error: { code: 'NETWORK_ERROR' } });
    const view = setup(); await ready();
    expect(screen.getByText(/estimativas locais/)).toBeTruthy(); submit();
    await waitFor(() => expect(view.onConfirm).toHaveBeenCalledWith([{ ...item, reconciledExpected: 4, difference: 1 }]));
  });

  it('survives StrictMode and a same-content parent rerender without losing the query', async () => {
    let finish!: (value: unknown) => void;
    mocks.range.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const onConfirm = vi.fn(), onCancel = vi.fn();
    const view = render(<React.StrictMode><InventoryReviewModal items={[item]} startDate={startDate} onConfirm={onConfirm} onCancel={onCancel} /></React.StrictMode>);
    await waitFor(() => expect(mocks.range).toHaveBeenCalledOnce());
    view.rerender(<React.StrictMode><InventoryReviewModal items={[{ ...item }]} startDate={startDate} onConfirm={onConfirm} onCancel={onCancel} /></React.StrictMode>);
    await act(async () => { finish({ data: [move('entry', 1)], error: null }); }); await ready(); submit();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith([{ ...item, reconciledExpected: 5, difference: 0 }]));
    expect(mocks.range).toHaveBeenCalledOnce();
  });

  it('holds the confirmation lock through the callback, blocks closing and shows false failures', async () => {
    let finish!: (value: boolean) => void;
    const onConfirm = vi.fn().mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue(true);
    const view = setup([item], onConfirm); await ready();
    submit(); submit(); fireEvent.click(screen.getByRole('button', { name: 'Fechar revisão' })); fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(view.onCancel).not.toHaveBeenCalled(); expect(screen.getByRole('status').textContent).toContain('concluindo');
    await act(async () => { finish(false); });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível concluir'); expect(screen.queryByRole('status')).toBeNull();
    submit(); await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
  });

  it('blocks repeated confirmation after its deadline', async () => {
    const onConfirm = vi.fn().mockReturnValue(new Promise(() => {}));
    const view = setup([item], onConfirm); await ready(); vi.useFakeTimers();
    await act(async () => { submit(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada no prazo');
    expect(screen.queryByRole('status')).toBeNull(); submit(); expect(onConfirm).toHaveBeenCalledOnce();
    view.unmount();
  });

  it('does not show a late callback failure on a different inventory owner', async () => {
    let finish!: (value: boolean) => void;
    const onConfirm = vi.fn().mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = setup([item], onConfirm); await ready(); submit(); await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    const next = { ...item, id: 'next-item', key: 'next-item' };
    view.rerender(<InventoryReviewModal items={[next]} startDate={startDate} onConfirm={onConfirm} onCancel={view.onCancel} />);
    await ready(); await act(async () => { finish(false); });
    expect(screen.queryByRole('alert')).toBeNull(); expect(screen.queryByRole('status')).toBeNull();
    expect((screen.getByRole('button', { name: /Concluir Inventário/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not invoke confirmation after unmount during validation', async () => {
    const view = setup(); await ready(); submit(); view.unmount(); await act(async () => {});
    expect(view.onConfirm).not.toHaveBeenCalled();
  });
});
