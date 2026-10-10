import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../types/order.type';

const { mockSupabaseSingle, mockSupabaseEq } = vi.hoisted(() => ({
  mockSupabaseSingle: vi.fn(),
  mockSupabaseEq: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: mockSupabaseEq.mockReturnThis(),
      single: mockSupabaseSingle,
    })),
  },
}));

import { undoReturn } from '../orderLifecycleOperations';

describe('undoReturn - cancelamento comercial de uma devolução específica', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancela somente a devolução agendada, sem efeito de estoque, preservando o vínculo com a venda', async () => {
    const updatedAt = '2026-10-10T12:00:00.000Z';
    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        id: 'return-101',
        status: 'scheduled',
        order_type: 'return',
        updated_at: updatedAt,
        order_data: {
          id: 'return-101',
          orderType: 'return',
          status: 'scheduled',
          linkedOrderId: 'sale-201',
          returnStockProcessed: false,
        },
      },
      error: null,
    });
    const updateOrderFn = vi.fn().mockResolvedValue(undefined);

    await undoReturn(
      { id: 'return-101', orderType: 'return', status: 'scheduled' } as Order,
      updateOrderFn
    );

    expect(updateOrderFn).toHaveBeenCalledTimes(1);
    expect(updateOrderFn).toHaveBeenCalledWith(
      'return-101',
      { status: 'cancelled', returnStockProcessed: false, returnStockReversed: false },
      expect.objectContaining({ id: 'return-101', linkedOrderId: 'sale-201' }),
      updatedAt
    );
  });

  it('cancela devoluções agendadas em sequência, consultando e atualizando cada ID próprio', async () => {
    mockSupabaseSingle
      .mockResolvedValueOnce({
        data: {
          id: 'return-201',
          status: 'scheduled',
          order_type: 'return',
          updated_at: '2026-10-10T12:10:00.000Z',
          order_data: { id: 'return-201', orderType: 'return', linkedOrderId: 'sale-301' },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'return-202',
          status: 'scheduled',
          order_type: 'return',
          updated_at: '2026-10-10T12:11:00.000Z',
          order_data: { id: 'return-202', orderType: 'return', linkedOrderId: 'sale-301' },
        },
        error: null,
      });
    const updateOrderFn = vi.fn().mockResolvedValue(undefined);

    await undoReturn(
      { id: 'return-201', orderType: 'return', status: 'scheduled' } as Order,
      updateOrderFn
    );
    await undoReturn(
      { id: 'return-202', orderType: 'return', status: 'scheduled' } as Order,
      updateOrderFn
    );

    expect(mockSupabaseEq.mock.calls).toEqual([
      ['id', 'return-201'],
      ['id', 'return-202'],
    ]);
    expect(updateOrderFn).toHaveBeenCalledTimes(2);
    expect(updateOrderFn.mock.calls.map(([id]) => id)).toEqual(['return-201', 'return-202']);
    expect(updateOrderFn.mock.calls.map(([, updates]) => updates)).toEqual([
      { status: 'cancelled', returnStockProcessed: false, returnStockReversed: false },
      { status: 'cancelled', returnStockProcessed: false, returnStockReversed: false },
    ]);
    expect(updateOrderFn.mock.calls.map(([, , currentOrder]) => currentOrder?.linkedOrderId)).toEqual([
      'sale-301',
      'sale-301',
    ]);
  });

  it('bloqueia cancelamento comercial depois da confirmação física', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        id: 'return-102',
        status: 'fulfilled',
        order_type: 'return',
        updated_at: '2026-10-10T12:01:00.000Z',
        order_data: { id: 'return-102', returnStockProcessed: true },
      },
      error: null,
    });
    const updateOrderFn = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      undoReturn(
        { id: 'return-102', orderType: 'return', status: 'scheduled' } as Order,
        updateOrderFn
      )
    ).rejects.toThrow('A confirmação física desta devolução já foi registrada');

    expect(updateOrderFn).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('exige o identificador da devolução em vez de escolher arbitrariamente uma pelo pedido de venda', async () => {
    const updateOrderFn = vi.fn();

    await expect(
      undoReturn({ id: 'sale-201', orderType: 'sale', status: 'fulfilled' } as Order, updateOrderFn)
    ).rejects.toThrow('Selecione o pedido de devolução específico');

    expect(mockSupabaseSingle).not.toHaveBeenCalled();
    expect(updateOrderFn).not.toHaveBeenCalled();
  });

  it('trata uma repetição de cancelamento como no-op', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        id: 'return-103',
        status: 'cancelled',
        order_type: 'return',
        updated_at: '2026-10-10T12:02:00.000Z',
        order_data: { id: 'return-103' },
      },
      error: null,
    });
    const updateOrderFn = vi.fn();

    await undoReturn(
      { id: 'return-103', orderType: 'return', status: 'cancelled' } as Order,
      updateOrderFn
    );

    expect(updateOrderFn).not.toHaveBeenCalled();
  });
});
