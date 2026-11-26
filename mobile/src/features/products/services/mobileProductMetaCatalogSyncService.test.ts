import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncMobileMetaCatalog } from './catalog/mobileMetaCatalogSyncService';
import {
  syncMobileProductToMetaCatalog,
  triggerMobileProductMetaCatalogSync,
} from './catalog/mobileProductMetaCatalogSyncService';

const session = vi.hoisted(() => vi.fn());
vi.mock('../../../services/supabaseClient', () => ({ supabase: { auth: { getSession: session } } }));

const productId = '123e4567-e89b-42d3-a456-426614174000';
const report = { success: true, count: 2, created: 0, updated: 0, deleted: 2, errors: 0 };
const fetchMock = vi.fn();

describe('sincronização do app com o Catálogo Meta', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_ERP_API_URL', 'https://erp.example');
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => Response.json(report));
    session.mockResolvedValue({ data: { session: { access_token: 'unit-token' } }, error: null });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('usa a sessão do app e envia somente o ID de produto ao ERP', async () => {
    await expect(syncMobileProductToMetaCatalog(productId)).resolves.toEqual(report);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://erp.example/api/meta-graph');
    expect(options.headers.Authorization).toBe('Bearer unit-token');
    expect(JSON.parse(options.body)).toEqual({ operation: 'reconcile_catalog', productId });
  });

  it('agrupa alterações rápidas de um mesmo produto', async () => {
    vi.useFakeTimers();
    triggerMobileProductMetaCatalogSync(productId);
    triggerMobileProductMetaCatalogSync(productId);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('mostra falha se o servidor não confirmar a remoção', async () => {
    const failure = { success: false, count: 0, errors: 1, error: 'Exclusão sem confirmação.' };
    fetchMock.mockResolvedValueOnce(Response.json(failure));
    await expect(syncMobileProductToMetaCatalog(productId)).resolves.toEqual(failure);
  });

  it('usa a mesma reconciliação completa na ação manual administrativa', async () => {
    await expect(syncMobileMetaCatalog(false)).resolves.toMatchObject({ success: false });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(syncMobileMetaCatalog(true)).resolves.toEqual(report);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ operation: 'reconcile_catalog' });
  });
});
