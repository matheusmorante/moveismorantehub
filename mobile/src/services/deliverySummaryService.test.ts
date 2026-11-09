import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getItem: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: mocks.getItem, setItem: vi.fn() },
}));
vi.mock('./supabaseClient', () => ({ supabase: { from: mocks.from } }));

import {
  getLatestSavedSummaryRecord,
  getSavedSummaryRecord,
} from './deliverySummaryService';

const createQuery = (result: { data: any; error: any }) => {
  const query: any = {};
  for (const method of ['select', 'eq', 'order', 'limit']) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  return query;
};

describe('delivery summary read projections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItem.mockResolvedValue(null);
  });

  it('loads only the saved text and lease fields for a matching fingerprint', async () => {
    const data = {
      text: 'Resumo salvo',
      text_status: 'READY',
      generation_started_at: null,
    };
    const query = createQuery({ data, error: null });
    mocks.from.mockReturnValue(query);

    await expect(getSavedSummaryRecord('today', 'fingerprint-1')).resolves.toEqual(data);

    expect(mocks.from).toHaveBeenCalledWith('delivery_summaries');
    expect(query.select).toHaveBeenCalledWith('text, text_status, generation_started_at');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'scope', 'today');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'data_fingerprint', 'fingerprint-1');
  });

  it('preserves the latest-record ordering and limit while projecting the same fields', async () => {
    const data = {
      text: 'Resumo mais recente',
      text_status: 'READY',
      generation_started_at: null,
    };
    const query = createQuery({ data, error: null });
    mocks.from.mockReturnValue(query);

    await expect(getLatestSavedSummaryRecord('tomorrow')).resolves.toEqual(data);

    expect(query.select).toHaveBeenCalledWith('text, text_status, generation_started_at');
    expect(query.eq).toHaveBeenCalledWith('scope', 'tomorrow');
    expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('keeps the existing local fallback when the server read returns an error', async () => {
    const cachedRecord = {
      id: 'summary-1',
      scope: 'next_days',
      data_fingerprint: 'fingerprint-2',
      text: 'Resumo local',
      text_status: 'READY',
      generator_version: 'v1',
      generation_started_at: null,
      error_message: null,
    };
    mocks.from.mockReturnValue(createQuery({ data: null, error: new Error('offline') }));
    mocks.getItem.mockResolvedValue(JSON.stringify(cachedRecord));

    await expect(getSavedSummaryRecord('next_days', 'fingerprint-2')).resolves.toEqual(
      cachedRecord
    );
    expect(mocks.getItem).toHaveBeenCalledWith(
      '@morante_delivery_summary_next_days_fingerprint-2'
    );
  });
});
