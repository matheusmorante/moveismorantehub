import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMetaCatalogBatchPayload } from '../../../../../../../shared-utils/metaCatalogBatchPayload';
import { ownershipLabel } from '../../../../../../api/_lib/metaCatalogReconciliation/plan';
import { MetaCatalogSyncBusy, runMetaCatalogReconciliation } from '../../../../../../api/_lib/metaCatalogReconciliation/run';
import { loadDesiredCatalog } from '../../../../../../api/_lib/metaCatalogReconciliation/source';

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
  loadDesiredCatalog: vi.fn(async () => ({ items: new Map(), blocked: new Map(), candidateRetailers: null })),
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
  vi.mocked(loadDesiredCatalog).mockClear();
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

  it('reconsulta somente SKUs pendentes e confirma criação quando o item está publicado e em estoque', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    db.rpc.mockResolvedValue({ data: true, error: null });
    const requests = buildMetaCatalogBatchPayload(['SOFA-OK', 'SOFA-AUSENTE', 'SOFA-OCULTO'].map((code) => ({
      id: productId, code, name: code, status: 'published', price: 900,
      images: ['https://catalog.example/sofa.png'],
    }))).requests;
    vi.mocked(loadDesiredCatalog).mockResolvedValueOnce({
      candidateRetailers: null, blocked: new Map(),
      items: new Map(requests.map((request) => [request.retailer_id, { productId, request }])),
    });
    const checks: string[][] = [];
    const writes: unknown[] = [];
    const published = {
      id: '330', retailer_id: 'SOFA-OK', custom_label_4: ownershipLabel(productId),
      visibility: 'published', availability: 'IN_STOCK', quantity_to_sell_on_facebook: '1',
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/data_sources')) {
        return Response.json({ data: [{ id: '1111', name: 'App 1001' }] });
      }
      if (request.pathname.endsWith('/items_batch')) {
        writes.push(...JSON.parse(String(init.body)).requests);
        return Response.json({ handles: ['batch-visibilidade'] });
      }
      if (request.pathname.endsWith('/check_batch_request_status')) {
        return Response.json({ data: [{ handle: 'batch-visibilidade', status: 'finished' }] });
      }
      const filter = request.searchParams.get('filter');
      if (!filter) return Response.json({ data: [] });
      const skus = JSON.parse(filter).retailer_id.is_any;
      checks.push(skus);
      const staged = { ...published, id: '331', retailer_id: 'SOFA-OCULTO', visibility: 'staging' };
      const data = checks.length === 2 ? [published, staged] : [staged];
      return Response.json({ data });
    }));
    const operation = runMetaCatalogReconciliation({ trigger: 'manual' });
    await vi.advanceTimersByTimeAsync(4_901);
    await expect(operation).resolves.toMatchObject({ success: false, created: 1, count: 1, errors: 2 });
    expect(writes).toHaveLength(3);
    expect(checks).toEqual([
      ['SOFA-OK', 'SOFA-AUSENTE', 'SOFA-OCULTO'],
      ['SOFA-OK', 'SOFA-AUSENTE', 'SOFA-OCULTO'],
      ['SOFA-AUSENTE', 'SOFA-OCULTO'],
      ['SOFA-AUSENTE', 'SOFA-OCULTO'],
    ]);
    expect(db.rpc).toHaveBeenLastCalledWith('finish_meta_catalog_sync', expect.objectContaining({
      p_run: expect.objectContaining({ issues: [
        { catalog: 'whatsapp', retailerId: 'SOFA-AUSENTE', reason: expect.stringContaining('não aparece') },
        { catalog: 'whatsapp', retailerId: 'SOFA-OCULTO', reason: expect.stringContaining('sem visibilidade') },
      ] }),
    }));
  });
});
