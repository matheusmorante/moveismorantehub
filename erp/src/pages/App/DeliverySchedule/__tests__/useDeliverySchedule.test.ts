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

  it('posiciona o pedido no próximo agendamento alternativo quando a data principal vence e o pedido não foi atendido', async () => {
    // Pedido com data definida no passado (2020-01-01) e alternativa no futuro (2099-05-10)
    const orderWithPassedSchedule = {
      id: 'repositioned-order',
      status: 'scheduled',
      orderType: 'sale',
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: {
          date: '2020-01-01',
          startTime: '09:00',
          alternatives: [
            { date: '2099-05-10', period: 'morning', time: '10:00' },
          ],
        },
      },
      items: [],
    };

    mocks.fetchScheduledAndDraftOrders.mockResolvedValueOnce([orderWithPassedSchedule]);

    const { result } = renderHook(() => useDeliverySchedule());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Não deve aparecer na data passada 2020-01-01
    expect(result.current.schedule['2020-01-01']).toBeUndefined();

    // Deve aparecer na data alternativa 2099-05-10
    await waitFor(() =>
      expect(result.current.schedule['2099-05-10']?.map((item) => item.id)).toEqual(['repositioned-order'])
    );
  });
});
