import { describe, expect, it, vi } from 'vitest';
import type Order from '../../types/order.type';
import { buildOrderPersistencePayload } from '../order/orderPersistencePayload';
import { moveToTrash } from '../order/orderLifecycleOperations';

describe('moveToTrash', () => {
  it('uses a persistence-safe ISO timestamp for deletedAt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-28T00:30:00.000Z'));
    const updateOrder = vi.fn().mockResolvedValue(undefined);

    try {
      await moveToTrash('assistance-1', updateOrder);

      const updates = updateOrder.mock.calls[0][1] as Partial<Order>;
      expect(updates.deleted).toBe(true);
      expect(updates.deletedAt).toBe('2026-11-28T00:30:00.000Z');
      expect(
        buildOrderPersistencePayload({ ...updates, id: 'assistance-1' } as Order).deleted_at
      ).toBe('2026-11-28T00:30:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });
});
