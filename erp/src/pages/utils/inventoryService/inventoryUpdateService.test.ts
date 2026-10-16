import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), state: vi.fn(), invalidation: vi.fn(), stats: vi.fn(),
  lookup: null as any, reply: null as any, writes: vi.fn(),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('./inventorySubscriptionState', () => ({ prependMoveToState: vi.fn(), removeMoveFromState: vi.fn(), updateMoveInState: mocks.state }));
vi.mock('./inventoryStockCalculator', () => ({ recalculateProductStockOnMove: vi.fn(), revertProductStockFromMove: vi.fn() }));
vi.mock('@/pages/utils/inventoryAuditBalance', () => ({ recalculateInventoryAuditBalance: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: mocks.invalidation } }));
vi.mock('@/pages/App/Products/ProductList/services/productCatalogStatsService', () => ({ invalidateProductCatalogStatsCache: mocks.stats }));
import { updateInventoryMove } from './inventoryMutationService';

const row = {
  id: 'move-1', product_id: 'p1', variation_id: 'v1', product_description: 'Produto', type: 'entry', quantity: 2, unit_cost: 3, unit_price: 0,
  date: '2026-10-15T12:00:00Z', label: 'Entrada', order_id: null, source_receipt_id: null, source_item_index: null,
  observation: JSON.stringify({ status: 'effective', note: 'Origem', testArtifact: { runId: 'owned' } }),
};
const expected = { productId: 'p1', quantity: 2, unitCost: 3 };
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup = { data: { ...row }, error: null };
  mocks.reply = { data: { move: { ...row, quantity: 4, unit_cost: 0 }, balance_delta: 2 }, error: null, status: 200 };
  mocks.rpc.mockImplementation(async () => mocks.reply); mocks.invalidation.mockResolvedValue(undefined);
  mocks.from.mockImplementation((table) => {
    if (table !== 'inventory_moves') throw new Error('Client must not write product balances.');
    const query: any = {
      select: vi.fn(() => query), eq: vi.fn(() => query), single: vi.fn(async () => mocks.lookup),
      update: mocks.writes, insert: mocks.writes,
    }; return query;
  });
});

describe('inventory batch transactional service boundary', () => {
  it('rejects invalid values, unsupported ledger fields and a missing snapshot before querying', async () => {
    for (const patch of [{ quantity: Infinity }, { quantity: -1 }, { unitCost: -1 }, { date: '2026-02-30' }, { type: 'exit' }, { observation: 'altered' }, { productId: 'other' }, {}]) {
      await expect(updateInventoryMove('move-1', patch as any, expected)).rejects.toThrow();
    }
    await expect(updateInventoryMove(' ', { quantity: 1 }, expected)).rejects.toThrow();
    await expect(updateInventoryMove('move-1', { quantity: 1 })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserves zero values and sends the parsed UI baseline in one command', async () => {
    mocks.reply.data.move.quantity = 0; mocks.reply.data.balance_delta = -2;
    await expect(updateInventoryMove(' move-1 ', { quantity: 0, unitCost: 0 }, { ...expected, productId: ' p1 ' }))
      .resolves.toMatchObject({ id: 'move-1', quantity: 0, unitCost: 0 });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('update_inventory_batch', {
      p_move_id: 'move-1', p_product_id: 'p1', p_expected_quantity: 2, p_expected_unit_cost: 3, p_quantity: 0, p_unit_cost: 0,
    });
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.state).toHaveBeenCalledWith('move-1', expect.objectContaining({ quantity: 0, unitCost: 0 }));
    expect(mocks.invalidation).toHaveBeenCalledWith({ queryKey: ['products'] });
  });
  it.each([{ ...expected, productId: 'other' }, { ...expected, quantity: 3 }, { ...expected, unitCost: 4 }])('rejects a stale UI baseline before RPC %#', async (snapshot) => {
    await expect(updateInventoryMove('move-1', { quantity: 4 }, snapshot)).rejects.toThrow('lote foi alterado');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('propagates lookup errors and rejects missing, malformed or non-entry rows before RPC', async () => {
    mocks.lookup = { data: row, error: { code: '42501' } };
    await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toMatchObject({ code: '42501' });
    mocks.lookup = { data: null, error: null };
    await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toThrow('não encontrado');
    for (const patch of [{ quantity: 'invalid' }, { type: 'exit' }, { id: 'other' }]) {
      mocks.lookup.data = { ...row, ...patch };
      await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toThrow('dados do lote');
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    null, { move: null, balance_delta: 2 }, { move: { ...row, quantity: 4, unit_cost: 0 }, balance_delta: '2' },
    ...[{ id: 'other' }, { product_id: 'other' }, { variation_id: 'other' }, { quantity: 99 }, { unit_cost: 1 }]
      .map((patch) => ({ move: { ...row, quantity: 4, unit_cost: 0, ...patch }, balance_delta: 2 })),
  ])('treats missing/mismatched acknowledgment as uncertain without publishing %#', async (data) => {
    mocks.reply.data = data;
    await expect(updateInventoryMove('move-1', { quantity: 4, unitCost: 0 }, expected)).rejects.toMatchObject({ uncertain: true });
    expect(mocks.state).not.toHaveBeenCalled(); expect(mocks.stats).not.toHaveBeenCalled(); expect(mocks.writes).not.toHaveBeenCalled();
  });
  it('accepts cent rounding and preserves the untouched quantity, origins and raw metadata', async () => {
    mocks.reply.data = { move: { ...row, unit_cost: '3.33' }, balance_delta: 0 };
    await expect(updateInventoryMove('move-1', { unitCost: 10 / 3 }, expected)).resolves.toMatchObject({ unitCost: 3.33, quantity: 2 });
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_quantity: 2, p_unit_cost: 10 / 3 });
    expect(mocks.lookup.data.observation).toBe(row.observation);
    mocks.reply.data.move.unit_cost = 3.34;
    await expect(updateInventoryMove('move-1', { unitCost: 10 / 3 }, expected)).rejects.toMatchObject({ uncertain: true });
  });
  it('accepts a zero delta from the backend without applying a second client delta', async () => {
    mocks.reply.data.balance_delta = 0;
    await expect(updateInventoryMove('move-1', { quantity: 4, unitCost: 0 }, expected)).resolves.toMatchObject({ quantity: 4 });
    expect(mocks.from).toHaveBeenCalledOnce(); expect(mocks.from).toHaveBeenCalledWith('inventory_moves'); expect(mocks.writes).not.toHaveBeenCalled();
  });
  it.each([['42501', 'Você não tem permissão'], ['40001', 'Recarregue o histórico'], ['22023', 'deve ser inteira']])('presents a known SQL rejection without technical tokens or an uncertain commit: %s', async (code, message) => {
    mocks.reply = { data: null, error: { code, message: 'INVENTORY_BATCH_INTERNAL_MESSAGE' }, status: 400 };
    await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toMatchObject({ code, message: expect.stringContaining(message) });
    expect(mocks.state).not.toHaveBeenCalled();
  });
  it('does not fall back to unsafe writes while the additive RPC is unavailable', async () => {
    mocks.reply = { data: null, error: { code: 'PGRST202' }, status: 404 };
    await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toThrow('ainda não está disponível');
    expect(mocks.writes).not.toHaveBeenCalled(); expect(mocks.state).not.toHaveBeenCalled();
  });
  it('does not start a write after the preflight query has exceeded its deadline', async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    mocks.lookup = new Promise((resolve) => { finish = resolve; });
    const outcome = updateInventoryMove('move-1', { quantity: 4 }, expected).catch((error) => error);
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await outcome).message).toContain('consultar o lote no prazo');
    finish({ data: row, error: null }); await Promise.resolve(); await Promise.resolve();
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.state).not.toHaveBeenCalled();
  });
  it('treats transport failures and ambiguous SQL connection errors as unconfirmed', async () => {
    mocks.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toMatchObject({ uncertain: true });
    for (const error of [{ message: 'Failed to fetch' }, { code: '40003' }, { code: '08006' }]) {
      mocks.reply = { data: null, error, status: 0 };
      await expect(updateInventoryMove('move-1', { quantity: 4 }, expected)).rejects.toMatchObject({ uncertain: true });
    }
    expect(mocks.state).not.toHaveBeenCalled();
  });
});

