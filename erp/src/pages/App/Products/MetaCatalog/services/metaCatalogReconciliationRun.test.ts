import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ownershipLabel } from '../../../../../../api/_lib/metaCatalogReconciliation/plan';
import { MetaCatalogSyncBusy, runMetaCatalogReconciliation } from '../../../../../../api/_lib/metaCatalogReconciliation/run';

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../../../../../../api/_lib/metaCatalogReconciliation/deletionHistory', () => ({
  recordDeletionAttempts: vi.fn(async () => undefined),
  confirmDeletionHistory: vi.fn(async () => undefined),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => db }));
vi.mock('../../../../../../api/_lib/metaCatalogReconciliation/source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../api/_lib/metaCatalogReconciliation/source')>()),
  loadCandidateRetailers: vi.fn(async () => []),
  loadDesiredCatalog: vi.fn(async () => ({ items: new Map(), blocked: new Map() })),
  loadVerifiedItems: vi.fn(async () => []),
  loadRetailerOwners: vi.fn(async () => new Map()),
}));

const catalogId = '3884846918337684';
const productId = '123e4567-e89b-42d3-a456-426614174000';
const hiddenItem = { id: '7123', retailer_id: 'OCULTO-1', custom_label_4: ownershipLabel(productId) };
const alsoHidden = { id: '7124', retailer_id: 'OCULTO-2', custom_label_4: ownershipLabel(productId) };

beforeEach(() => {
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-resolver-token');
  vi.stubEnv('WHATSAPP_APP_ID', '1001');
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  db.rpc.mockReset();
  db.from.mockReset();
  db.from.mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { catalogId, description: null } }) }) }),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('execução da reconciliação do Catálogo Meta', () => {
  it('impede uma nova execução antes de consultar ERP e Meta', async () => {
    db.rpc.mockResolvedValue({ data: false, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(runMetaCatalogReconciliation({ trigger: 'hourly' })).rejects.toBeInstanceOf(MetaCatalogSyncBusy);
    expect(db.from).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('conta a exclusão depois da consulta por SKU e registra falha sem perder o sucesso do outro item', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    db.rpc.mockResolvedValue({ data: true, error: null });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: [{ id: '1111', name: 'App 2002' }] }))
      .mockResolvedValueOnce(Response.json({ data: [hiddenItem, alsoHidden, { id: '9', retailer_id: 'MANUAL' }] }))
      .mockResolvedValueOnce(Response.json({ handles: ['handle-unit'] }))
      .mockResolvedValueOnce(Response.json({ data: [{ handle: 'handle-unit', status: 'finished' }] }))
      .mockImplementation(async () => Response.json({ data: [alsoHidden] }));
    vi.stubGlobal('fetch', fetchMock);

    const operation = runMetaCatalogReconciliation({ trigger: 'hourly' });
    await vi.advanceTimersByTimeAsync(4_901);
    await expect(operation).resolves.toMatchObject({ success: false, count: 1, deleted: 1, errors: 1 });
    const sent = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(sent.requests.map((request: { data: { id: string } }) => request.data.id)).toEqual(['OCULTO-1', 'OCULTO-2']);
    expect(new URL(fetchMock.mock.calls[4][0]).searchParams.get('filter')).toBe(
      JSON.stringify({ retailer_id: { is_any: ['OCULTO-1', 'OCULTO-2'] } }),
    );
    expect(db.rpc).toHaveBeenLastCalledWith('finish_meta_catalog_sync', expect.objectContaining({
      p_full: true,
      p_failed: true,
      p_run: expect.objectContaining({
        issues: [expect.objectContaining({ retailerId: 'OCULTO-2' })],
      }),
    }));
  });

  it('bloqueia o plano de exclusão em massa de um catálogo exclusivo', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    db.rpc.mockResolvedValue({ data: true, error: null });
    const items = Array.from({ length: 12 }, (_, index) => ({ id: String(index), retailer_id: `STALE-${index}` }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: [{ id: '1111', name: 'App 1001' }] }))
      .mockResolvedValueOnce(Response.json({ data: items }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(runMetaCatalogReconciliation({ trigger: 'hourly' })).resolves.toMatchObject({
      success: false, deleted: 0, error: expect.stringContaining('Exclusão em massa bloqueada'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
