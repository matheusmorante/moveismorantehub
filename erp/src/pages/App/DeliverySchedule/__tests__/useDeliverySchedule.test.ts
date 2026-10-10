// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchScheduledAndDraftOrders: vi.fn(),
  subscribeToOrderChanges: vi.fn(),
  orderChangesListener: undefined as (() => void) | undefined,
}));

vi.mock('../../../utils/orderHistoryService', () => ({
  fetchScheduledAndDraftOrders: mocks.fetchScheduledAndDraftOrders,
  subscribeToOrderChanges: mocks.subscribeToOrderChanges,
  updateOrder: vi.fn(),
}));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({}),
  subscribeToSettings: () => () => undefined,
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    channel: () => ({ on() { return this; }, subscribe: () => ({}) }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@/pages/utils/maps', () => ({ autoCalculateRouteDistance: vi.fn() }));

import { useDeliverySchedule } from '../useDeliverySchedule';

const order = (id: string) => ({
  id,
  status: 'scheduled',
  orderType: 'sale',
  shipping: {
    deliveryMethod: 'delivery',
    scheduling: { date: '2099-01-01', startTime: '09:00' },
  },
  items: [],
});

describe('useDeliverySchedule', () => {
  beforeEach(() => {
    mocks.fetchScheduledAndDraftOrders.mockReset();
    mocks.subscribeToOrderChanges.mockReset().mockImplementation((listener: () => void) => {
      mocks.orderChangesListener = listener;
      return () => undefined;
    });
    mocks.orderChangesListener = undefined;
  });

  it('keeps the newest realtime refresh when an older request resolves later', async () => {
    let resolveInitial!: (orders: ReturnType<typeof order>[]) => void;
    let resolveRealtime!: (orders: ReturnType<typeof order>[]) => void;
    mocks.fetchScheduledAndDraftOrders
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRealtime = resolve; }));

    const { result } = renderHook(() => useDeliverySchedule());
    await waitFor(() => expect(mocks.fetchScheduledAndDraftOrders).toHaveBeenCalledTimes(1));
    expect(mocks.orderChangesListener).toBeTypeOf('function');

    act(() => mocks.orderChangesListener?.());
    await waitFor(() => expect(mocks.fetchScheduledAndDraftOrders).toHaveBeenCalledTimes(2));

    await act(async () => resolveRealtime([order('newest-order')]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() =>
      expect(result.current.schedule['2099-01-01']?.map((item) => item.id)).toEqual(['newest-order'])
    );

    await act(async () => resolveInitial([order('stale-order')]));
    await waitFor(() =>
      expect(result.current.schedule['2099-01-01']?.map((item) => item.id)).toEqual(['newest-order'])
    );
  });
});
