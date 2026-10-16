import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), prepend: vi.fn(), audit: vi.fn(), delta: vi.fn(), reply: null as any, existing: null as any, duplicate: null as any }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('./inventorySubscriptionState', () => ({ prependMoveToState: mocks.prepend, removeMoveFromState: vi.fn(), updateMoveInState: vi.fn() }));
vi.mock('./inventoryStockCalculator', () => ({ recalculateProductStockOnMove: mocks.delta, revertProductStockFromMove: vi.fn() }));
vi.mock('@/pages/utils/inventoryAuditBalance', () => ({ recalculateInventoryAuditBalance: mocks.audit }));
vi.mock('@/pages/utils/productService', () => ({ mapFromDB: vi.fn(), updateProduct: vi.fn() }));
import { saveInventoryMove } from './inventoryMutationService';
import { mapInventoryMoveFromDB } from './inventoryMapper';
import type InventoryMove from '../../types/inventoryMove.type';

const input: InventoryMove = { productId: 'product-1', variationId: 'variation-1', productDescription: 'Product', type: 'withdrawal', quantity: 2, date: '2026-10-15T12:00:00.000Z', label: 'Saída - Pedido #1', unitPrice: 0, relatedEntityId: 'order-1', relatedEntityType: 'sales_order', observation: ' Motivo ' };
const row = { id: 'move-1', product_id: 'product-1', variation_id: 'variation-1', product_description: 'Product', type: 'exit', quantity: 2, date: '2026-10-15T12:00:00+00:00', label: 'Saída - Pedido #1', unit_price: 0, unit_cost: null, order_id: 'order-1', source_receipt_id: null, source_item_index: null, observation: '{"note":" Motivo ","status":"effective","reversalReason":null,"reversedAt":null}' };
beforeEach(() => {
  vi.clearAllMocks(); mocks.audit.mockResolvedValue(true); mocks.delta.mockResolvedValue(undefined);
  mocks.reply = { data: [{ ...row }], error: null, status: 201 }; mocks.existing = null; mocks.duplicate = null;
  mocks.from.mockImplementation(() => {
    let writing = false;
    const query: any = { insert: vi.fn((value) => { mocks.insert(value); writing = true; return query; }), select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: mocks.existing, error: null })), single: vi.fn(async () => ({ data: mocks.duplicate, error: null })), then: (resolve: (value: unknown) => unknown) => Promise.resolve(writing ? mocks.reply : { data: null, error: null }).then(resolve) };
    return query;
  });
});
describe('real inventory creation boundary and acknowledgments', () => {
  it('rejects invalid type, quantity, date and receipt identity before I/O', async () => {
    for (const changes of [{ type: 'unknown' }, { quantity: 0 }, { quantity: Infinity }, { date: '2026-02-31' }, { sourceReceiptId: 'receipt' }, { unitCost: -1 }]) {
      await expect(saveInventoryMove({ ...input, ...changes } as InventoryMove)).rejects.toThrow();
    }
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('uses parsed product identities, maps withdrawal and preserves zero price/opaque test metadata', async () => {
    const observation = JSON.stringify({ note: 'Motivo', testArtifact: { runId: 'run-1', ownerId: 'owner-1' } });
    mocks.reply.data[0].observation = observation;
    const result = await saveInventoryMove({ ...input, productId: ' product-1 ', observation });
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ product_id: 'product-1', type: 'exit', unit_price: 0, order_id: 'order-1' })]);
    expect(JSON.parse(mocks.insert.mock.calls[0][0][0].observation).testArtifact).toEqual({ runId: 'run-1', ownerId: 'owner-1' });
    expect(result).toMatchObject({ id: 'move-1', type: 'withdrawal', unitPrice: 0 });
    expect(mocks.delta).not.toHaveBeenCalled();
  });
  it('supports a negative nonzero adjustment and an ISO civil date', async () => {
    mocks.reply.data[0] = { ...row, type: 'adjustment', quantity: -2, date: '2026-10-15' };
    await expect(saveInventoryMove({ ...input, type: 'balance', quantity: -2, date: '2026-10-15' })).resolves.toMatchObject({ type: 'balance', quantity: -2 });
  });
  it('requires one confirmed row before publishing or recalculating', async () => {
    for (const data of [[], null, [{ ...row }, { ...row, id: 'other' }], [{ ...row, product_id: 'other' }], [{ ...row, quantity: 3 }]]) {
      mocks.reply = { data, error: null, status: 201 };
      await expect(saveInventoryMove(input)).rejects.toMatchObject({ uncertain: true });
    }
    expect(mocks.prepend).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled(); expect(mocks.delta).not.toHaveBeenCalled();
  });
  it('retains known database rejection as a pre-commit failure', async () => {
    const error = { code: '42501', message: 'Denied' }; mocks.reply = { data: null, error, status: 403 };
    await expect(saveInventoryMove(input)).rejects.toBe(error);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it('marks malformed, transport and cardinality responses as uncertain', async () => {
    for (const error of [{ code: '', message: 'Unexpected end of JSON input' }, { code: 'PGRST116' }]) {
      mocks.reply = { data: null, error, status: error.code ? 406 : 0 };
      await expect(saveInventoryMove(input)).rejects.toMatchObject({ uncertain: true });
    }
  });
  it('identifies a persisted movement when balance recalculation fails', async () => {
    mocks.audit.mockRejectedValueOnce(new Error('Balance failed'));
    await expect(saveInventoryMove(input)).rejects.toMatchObject({ uncertain: true, persistedMoveId: 'move-1' });
    expect(mocks.insert).toHaveBeenCalledOnce(); expect(mocks.prepend).toHaveBeenCalledOnce();
  });
  it('identifies a persisted movement when fallback balance calculation fails', async () => {
    mocks.audit.mockResolvedValue(false); mocks.delta.mockRejectedValueOnce(new Error('Product missing'));
    await expect(saveInventoryMove(input)).rejects.toMatchObject({ uncertain: true, persistedMoveId: 'move-1' });
    expect(mocks.delta).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2 }));
  });
  it('returns the acknowledged movement after successful fallback balance calculation', async () => {
    mocks.audit.mockResolvedValue(false);
    await expect(saveInventoryMove(input)).resolves.toMatchObject({ id: 'move-1' });
    expect(mocks.delta).toHaveBeenCalledOnce();
  });
  it('accepts the stored cent precision of a moving average and uses the persisted cost for the balance', async () => {
    mocks.audit.mockResolvedValue(false);
    mocks.reply.data[0].unit_cost = '3.33';
    await expect(saveInventoryMove({ ...input, unitCost: 10 / 3 })).resolves.toMatchObject({ unitCost: 3.33 });
    expect(mocks.delta).toHaveBeenCalledWith(expect.objectContaining({ unitCost: 3.33 }));
    mocks.reply.data[0].unit_cost = '3.34';
    await expect(saveInventoryMove({ ...input, unitCost: 10 / 3 })).rejects.toMatchObject({ uncertain: true });
    expect(mocks.delta).toHaveBeenCalledOnce();
  });
  it('accepts normal half-cent rounding but does not accept an unrelated rounded price', async () => {
    mocks.reply.data[0].unit_price = '1.01';
    await expect(saveInventoryMove({ ...input, unitPrice: 1.005 })).resolves.toMatchObject({ unitPrice: 1.01 });
    mocks.reply.data[0].unit_price = '3.33';
    await expect(saveInventoryMove({ ...input, unitPrice: 3.335 })).rejects.toMatchObject({ uncertain: true });
    mocks.reply.data[0].unit_price = '0.01';
    await expect(saveInventoryMove(input)).rejects.toMatchObject({ uncertain: true });
  });
  it('preserves receipt deduplication but does not acknowledge a different payload', async () => {
    mocks.existing = { ...row, source_receipt_id: 'receipt-1', source_item_index: 0 };
    const receiptInput = { ...input, sourceReceiptId: 'receipt-1', sourceItemIndex: 0 };
    await expect(saveInventoryMove(receiptInput)).resolves.toMatchObject({ id: 'move-1' });
    expect(mocks.insert).not.toHaveBeenCalled();
    mocks.existing.quantity = 4;
    await expect(saveInventoryMove(receiptInput)).rejects.toMatchObject({ uncertain: true });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('resolves a receipt uniqueness conflict only against the matching persisted row', async () => {
    mocks.reply = { data: null, error: { code: '23505' }, status: 409 };
    mocks.duplicate = { ...row, source_receipt_id: 'receipt-1', source_item_index: 0 };
    await expect(saveInventoryMove({ ...input, sourceReceiptId: 'receipt-1', sourceItemIndex: 0 })).resolves.toMatchObject({ id: 'move-1' });
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
});
describe('inventory mapper status and monetary zero', () => {
  it('keeps an effective reversal entry effective when its label starts with Estorno', () => {
    expect(mapInventoryMoveFromDB({ ...row, type: 'entry', reason: 'Estorno - Pedido #1' })).toMatchObject({ status: 'effective', unitPrice: 0 });
  });
  it('retains legacy reversal inference and explicit reversal metadata', () => {
    expect(mapInventoryMoveFromDB({ ...row, observation: '', reason: 'Estorno legado' }).status).toBe('reversed');
    expect(mapInventoryMoveFromDB({ ...row, observation: '{"status":"reversed"}' }).status).toBe('reversed');
  });
});
