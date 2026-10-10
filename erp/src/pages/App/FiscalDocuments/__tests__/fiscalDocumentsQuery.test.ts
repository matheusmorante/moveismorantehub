import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ from: vi.fn(), getSession: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: db.from, auth: { getSession: db.getSession } },
}));

import { fetchFiscalDocumentsList } from '../services/fiscalDocumentsService';

function createQuery(result: { data: unknown; count?: number | null; error?: unknown }) {
  const query: any = {};
  for (const method of ['select', 'eq', 'gte', 'lt', 'or', 'order']) {
    query[method] = vi.fn(() => query);
  }
  query.range = vi.fn().mockResolvedValue({ count: 0, error: null, ...result });
  return query;
}

const filters = {
  search: '',
  status: 'authorized',
  model: '55',
  environment: '1',
  dateFrom: '2026-10-01',
  dateTo: '2026-10-10',
};

describe('fetchFiscalDocumentsList query behavior', () => {
  beforeEach(() => {
    db.from.mockReset();
    db.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('applies filters before stable page range and returns exact count', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    db.from.mockReturnValue(query);

    const result = await fetchFiscalDocumentsList({ filters, pageIndex: 2 });

    expect(query.eq.mock.calls).toEqual([
      ['status', 'authorized'],
      ['modelo', '55'],
      ['ambiente', 1],
    ]);
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-10-01T00:00:00-03:00');
    expect(query.lt).toHaveBeenCalled();
    expect(query.order.mock.calls).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
    expect(query.range).toHaveBeenCalledWith(30, 44);
    expect(result).toMatchObject({ documents: [], totalCount: 0 });
  });

  it('propagates the primary list query error instead of presenting a false empty list', async () => {
    const queryError = new Error('falha de leitura fiscal');
    const query = createQuery({ data: null, count: null, error: queryError });
    db.from.mockReturnValue(query);

    await expect(fetchFiscalDocumentsList({ filters, pageIndex: 0 })).rejects.toBe(queryError);
  });
});
