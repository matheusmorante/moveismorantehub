import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: supabaseMock }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn() } }));

import { redeConciliationService } from './redeConciliationService';

describe('redeConciliationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads only fields needed to reconcile pending PIX transactions', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    supabaseMock.from.mockReturnValue(query);

    await redeConciliationService.syncPendingTransactions();

    expect(supabaseMock.from).toHaveBeenCalledWith('rede_transactions');
    expect(query.select).toHaveBeenCalledWith('tid, order_id, amount, payment_method');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'status', 'pending');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'payment_method', 'pix');
  });
});
