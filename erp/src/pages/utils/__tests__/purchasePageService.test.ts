import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(),
}));
vi.mock('../supabaseConfig', () => ({ supabase: mocks }));
vi.mock('../inventoryService', () => ({ cancelInventoryMovesByRelatedEntity: vi.fn() }));

import {
  fetchPurchaseById, fetchPurchasesPage, PURCHASE_PAGE_COLUMNS, subscribeToPurchasePageChanges,
} from '../purchasePageService';

const makeQuery = (response: any) => {
  const query: any = {};
  for (const method of ['select', 'eq', 'order', 'range', 'maybeSingle', 'abortSignal']) {
    query[method] = vi.fn().mockReturnValue(query);
  }
  query.then = (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject);
  return query;
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe('página remota de compras', () => {
  it('filtra fornecedor antes da página de15 e preserva itens legados sem criar número pela posição', async () => {
    const legacyItems = [{ productId: 'legacy-product', quantity: 3, unitCost: 17, totalCost: 51 }];
    const query = makeQuery({
      data: [{ id: 'purchase-old', supplier_id: 'supplier-a', status: 'opened', total_value: 51, items: legacyItems }],
      error: null, count: 102,
    });
    mocks.from.mockReturnValue(query);
    const result = await fetchPurchasesPage(2, { supplierId: 'supplier-a' });
    expect(query.select).toHaveBeenCalledWith(PURCHASE_PAGE_COLUMNS, { count: 'exact' });
    expect(query.eq).toHaveBeenCalledWith('supplier_id', 'supplier-a');
    expect(query.eq.mock.invocationCallOrder[0]).toBeLessThan(query.range.mock.invocationCallOrder[0]);
    expect(query.range).toHaveBeenCalledWith(15, 29);
    expect(query.order.mock.calls.map(([column]: [string]) => column)).toEqual(['date', 'created_at', 'id']);
    expect(result.total).toBe(102);
    expect(result.data[0]).toMatchObject({ status: 'ordered', totalValue: 51, items: legacyItems });
    expect(result.data[0].purchaseNumber).toBeUndefined();
    expect(PURCHASE_PAGE_COLUMNS).not.toContain('*');
    expect(PURCHASE_PAGE_COLUMNS).not.toContain('purchase_number');
  });

  it('devolve o total filtrado quando uma exclusão deixa a página fora do intervalo', async () => {
    const pageQuery = makeQuery({ data: null, error: { code: 'PGRST103' }, count: null });
    const countQuery = makeQuery({ data: null, error: null, count: 15 });
    mocks.from.mockReturnValueOnce(pageQuery).mockReturnValueOnce(countQuery);
    expect(await fetchPurchasesPage(2, { supplierId: 'supplier-a' })).toEqual({ data: [], total: 15 });
    expect(countQuery.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(countQuery.eq).toHaveBeenCalledWith('supplier_id', 'supplier-a');
  });

  it('abre um pedido pelo ID sem depender da página visível e propaga falha de consulta', async () => {
    const query = makeQuery({ data: { id: 'purchase-outside-page', items: [] }, error: null });
    mocks.from.mockReturnValue(query);
    expect((await fetchPurchaseById('purchase-outside-page'))?.id).toBe('purchase-outside-page');
    expect(query.eq).toHaveBeenCalledWith('id', 'purchase-outside-page');
    expect(query.maybeSingle).toHaveBeenCalled();
    mocks.from.mockReturnValue(makeQuery({ data: null, error: { message: 'unavailable' } }));
    await expect(fetchPurchasesPage(1)).rejects.toMatchObject({ message: 'unavailable' });
  });

  it('agrupa eventos e recupera mudanças após reconexão sem baixar a coleção antiga', () => {
    vi.useFakeTimers();
    const events: Array<() => void> = [];
    let statusCallback: (status: string) => void = () => undefined;
    const channel = {
      on: vi.fn((_event, _filter, callback) => { events.push(callback); return channel; }),
      subscribe: vi.fn((callback) => { statusCallback = callback; return channel; }),
    };
    mocks.channel.mockReturnValue(channel);
    const callback = vi.fn();
    const stop = subscribeToPurchasePageChanges(callback);
    statusCallback('SUBSCRIBED');
    expect(callback).not.toHaveBeenCalled();
    events[0]();
    events[1]();
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(1);
    statusCallback('SUBSCRIBED');
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(mocks.from).not.toHaveBeenCalled();
    events[0]();
    stop();
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(mocks.removeChannel).toHaveBeenCalledWith(channel);
  });
});
