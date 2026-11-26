import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { metaHttpClient } from '../metaService/metaHttpClient';
import {
  ensureProductMetaCatalogSync,
  fetchLastMetaCatalogRun,
  syncAllProductsToMetaCatalog,
  syncProductToMetaCatalog,
  triggerProductMetaCatalogSync,
} from './catalog/productMetaCatalogSync';

vi.mock('../metaService/metaHttpClient', () => ({ metaHttpClient: { request: vi.fn() } }));

const request = vi.mocked(metaHttpClient.request);
const productId = '123e4567-e89b-42d3-a456-426614174000';
const report = { success: true, count: 2, created: 0, updated: 0, deleted: 2, errors: 0 };

describe('sincronização de produtos do ERP com a Meta', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockImplementation(async () => Response.json(report));
  });

  afterEach(() => vi.useRealTimers());

  it('reconcilia um produto a partir de seu ID e propaga o resumo confirmado', async () => {
    await expect(syncProductToMetaCatalog(productId)).resolves.toEqual(report);
    expect(request).toHaveBeenCalledWith('reconcile_catalog', { productId }, undefined, 55_000);
  });

  it('concentra alterações sequenciais e compartilha o disparo com o salvamento', async () => {
    vi.useFakeTimers();
    const first = triggerProductMetaCatalogSync(productId);
    const second = triggerProductMetaCatalogSync(productId);
    expect(first).toBe(second);
    expect(ensureProductMetaCatalogSync(productId)).toBe(first);
    expect(request).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    await expect(first).resolves.toEqual(report);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('distingue uma execução em andamento de uma remoção confirmada', async () => {
    request.mockResolvedValueOnce(Response.json({ error: 'Catálogo em sincronização.' }, { status: 409 }));
    await expect(syncProductToMetaCatalog(productId)).resolves.toEqual({
      success: false, count: 0, error: 'Catálogo em sincronização.',
    });
  });

  it('usa a reconciliação do servidor para a ação manual e lê o último resultado', async () => {
    request.mockImplementationOnce(async () => Response.json(report));
    await expect(syncAllProductsToMetaCatalog()).resolves.toEqual(report);
    request.mockResolvedValueOnce(Response.json({ lastRun: report }));
    await expect(fetchLastMetaCatalogRun()).resolves.toEqual(report);
    expect(request.mock.calls.map(([operation, payload]) => [operation, payload])).toEqual([
      ['reconcile_catalog', {}], ['reconcile_catalog_status', {}],
    ]);
  });
});
