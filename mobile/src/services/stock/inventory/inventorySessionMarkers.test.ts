import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWorkingSet: vi.fn(),
  cacheWorkingSet: vi.fn(),
  getLocalDraft: vi.fn(),
  getSubmission: vi.fn(),
  single: vi.fn(),
  connected: true,
  explicitlyOffline: false,
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mocks.single,
        }),
      }),
    }),
  },
}));
vi.mock('../../offline/offlineStorageService', () => ({
  offlineStorageService: {
    getWorkingSet: mocks.getWorkingSet,
    cacheWorkingSet: mocks.cacheWorkingSet,
  },
}));
vi.mock('../../sqlite/inventoryDrafts', () => ({ getLocalInventoryDraft: mocks.getLocalDraft }));
vi.mock('../../sqlite/inventoryOutbox', () => ({ getInventorySubmission: mocks.getSubmission }));
vi.mock('../../offline/connectivityService', () => ({
  connectivityService: {
    get connected() {
      return mocks.connected;
    },
    get explicitlyOffline() {
      return mocks.explicitlyOffline;
    },
  },
}));
vi.mock('../stockMovesService', () => ({ ITEMS_PER_PAGE: 20, getStockPeriod: vi.fn() }));

import {
  extractSessionCodesFromMarkers,
  groupAdjustmentsBySession,
  mapInventorySessionMarker,
} from './inventorySessionMarkers';
import { fetchInventorySessionDetails } from './inventorySessionQueryService';

describe('inventorySessionMarkers & error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.getLocalDraft.mockResolvedValue(null);
    mocks.getSubmission.mockResolvedValue(null);
  });

  it('extracts codes and warns safely on malformed marker observation JSON', () => {
    const codes = extractSessionCodesFromMarkers([
      { id: 'm1', label: 'Inventário #000010', observation: '{"inventoryCode":"000010"}' },
      { id: 'm2', label: 'Inventário #000011', observation: '{broken-json' },
    ]);
    expect(codes).toEqual(['000010', '000011']);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('counts total and reversed adjustments from row status and observation JSON', () => {
    const grouped = groupAdjustmentsBySession([
      { id: 'a1', label: 'Ajuste lançado pelo inventário #000010', status: 'reversed' },
      { id: 'a2', label: 'Ajuste lançado pelo inventário #000010', observation: '{"status":"reversed"}' },
      { id: 'a3', label: 'Ajuste lançado pelo inventário #000010', observation: '{}' },
    ]);
    expect(grouped['000010']).toEqual({ total: 3, reversed: 2 });
  });

  it('maps session marker audit counts and adjustments cleanly', () => {
    const summary = mapInventorySessionMarker(
      {
        id: 'sess-1',
        label: 'Inventário #000010',
        created_at: '2026-10-01T10:00:00Z',
        observation: JSON.stringify({
          inventoryCode: '000010',
          responsibleName: 'Matheus',
          name: 'Auditoria Outubro',
          inventoryAudit: true,
          status: 'completed',
          items: [
            { physicalCount: 3 },
            { physicalCount: null },
            { physicalCount: 2 },
          ],
        }),
      },
      { '000010': { total: 4, reversed: 1 } }
    );
    expect(summary).toMatchObject({
      inventoryCode: '000010',
      name: 'Auditoria Outubro',
      responsibleName: 'Matheus',
      productsCount: 2,
      adjustmentsCount: 4,
      reversedCount: 1,
      status: 'completed',
    });
  });

  it('logs warning and falls back to stale local cache when remote details fetch fails', async () => {
    mocks.single.mockRejectedValue(new Error('offline timeout'));
    mocks.getWorkingSet.mockResolvedValue({
      data: { 'sess-1': { inventoryCode: '000010', items: [] } },
    });

    const details = await fetchInventorySessionDetails('sess-1', 'user-1');
    expect(details).toMatchObject({ inventoryCode: '000010', isStaleLocalSnapshot: true });
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
