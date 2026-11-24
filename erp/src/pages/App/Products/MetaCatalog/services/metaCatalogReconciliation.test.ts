import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMetaCatalogBatchPayload } from '../../../../../../../shared-utils/metaCatalogBatchPayload';
import { createCatalogGraph, type MetaProduct } from '../../../../../../api/_lib/metaCatalogReconciliation/graph';
import { ownershipLabel, planCatalogChanges } from '../../../../../../api/_lib/metaCatalogReconciliation/plan';
import type { DesiredCatalog, VerifiedItem } from '../../../../../../api/_lib/metaCatalogReconciliation/source';

const productId = '123e4567-e89b-42d3-a456-426614174000';
const otherProductId = '123e4567-e89b-42d3-a456-426614174001';
const marker = ownershipLabel(productId);
const empty = (): DesiredCatalog => ({ items: new Map(), blocked: new Map() });

function desiredProduct() {
  const desired = empty();
  const request = buildMetaCatalogBatchPayload([{
    id: productId,
    code: 'SKU-ERP',
    status: 'published',
    name: 'Poltrona',
    price: 1250,
    images: ['https://catalog.example/poltrona.png'],
    stock: 3,
  }]).requests[0];
  desired.items.set(request.retailer_id, { productId, request });
  return desired;
}

function metaProduct(data: Record<string, unknown>): MetaProduct {
  return {
    ...data,
    id: '3123',
    retailer_id: 'SKU-ERP',
    name: data.title,
    sale_price: data.sale_price ?? 'R$ 1.250,00',
    price: 'R$ 1.250,00',
    currency: 'BRL',
    url: data.link,
    image_url: data.image_link,
    additional_image_urls: [],
    retailer_product_group_id: data.item_group_id,
    custom_label_4: marker,
    custom_number_4: String(data.custom_number_4),
  };
}

describe('planejamento da reconciliação do catálogo', () => {
  it('cria o item ausente, ignora o equivalente e detecta divergência no catálogo', () => {
    const desired = desiredProduct();
    const create = planCatalogChanges(desired, [], new Map());
    expect(create.changes).toMatchObject([{ method: 'CREATE', data: { id: 'SKU-ERP', custom_label_4: marker } }]);
    const published = metaProduct(create.changes[0].data);

    expect(planCatalogChanges(desired, [published], new Map())).toMatchObject({ changes: [], unchanged: 1 });
    const changedByMeta = { ...published, name: 'Poltrona editada na Meta' };
    const plan = planCatalogChanges(desired, [changedByMeta], new Map());
    expect(plan.changes).toMatchObject([{ method: 'UPDATE', retailer_id: 'SKU-ERP', data: { title: 'Poltrona', sale_price: '' } }]);
  });

  it('protege itens externos e preserva o item ERP com dados de origem inválidos', () => {
    const desired = desiredProduct();
    desired.blocked.set('INVALID', 'Preço inválido.');
    const plan = planCatalogChanges(desired, [
      { id: '7', retailer_id: 'SKU-ERP' },
      { id: '8', retailer_id: 'MANUAL' },
      { id: '9', retailer_id: 'INVALID', custom_label_4: marker },
      { id: '10', retailer_id: 'REMOVIDO', custom_label_4: marker },
    ], new Map(), { completeSnapshot: true });
    expect(plan.changes).toEqual([{ method: 'DELETE', retailer_id: 'REMOVIDO', data: { id: 'REMOVIDO' } }]);
    expect([...plan.errors.keys()]).toEqual(['INVALID', 'SKU-ERP']);
  });

  it('corrige o vínculo de um SKU transferido quando o ERP inteiro foi conferido', () => {
    const desired = desiredProduct();
    const [create] = planCatalogChanges(desired, [], new Map()).changes;
    const remote = { ...metaProduct(create.data), custom_label_4: ownershipLabel(otherProductId) };

    const partial = planCatalogChanges(desired, [remote], new Map(), { scope: new Set([productId]) });
    expect(partial.changes).toEqual([]);
    expect(partial.errors.size).toBe(1);

    const complete = planCatalogChanges(desired, [remote], new Map(), { completeSnapshot: true });
    expect(complete.errors.size).toBe(0);
    expect(complete.changes).toMatchObject([
      { method: 'UPDATE', retailer_id: 'SKU-ERP', data: { custom_label_4: marker } },
    ]);
  });

  it('exige vínculo pelo ID interno da Meta para legado em catálogo compartilhado', () => {
    const verified = new Map<string, VerifiedItem>([['LEGACY', {
      catalog_id: '1234', retailer_id: 'LEGACY', meta_item_id: '11', product_id: productId,
    }]]);
    const scope = new Set([productId]);
    const plan = planCatalogChanges(empty(), [
      { id: '11', retailer_id: 'LEGACY' },
      { id: '12', retailer_id: 'OTHER', custom_label_4: ownershipLabel(otherProductId) },
    ], verified, { scope });
    expect(plan.changes).toMatchObject([{ method: 'DELETE', retailer_id: 'LEGACY' }]);

    expect(planCatalogChanges(empty(), [{ id: '22', retailer_id: 'LEGACY' }], verified, { scope }).changes).toEqual([]);
  });

  it('remove o SKU oculto sem rótulo somente dentro do escopo do produto certo', () => {
    const retailerOwners = new Map([
      ['OCULTO', new Set([productId])],
      ['OUTRO', new Set([otherProductId])],
      ['AMBIGUO', new Set([productId, otherProductId])],
    ]);
    const remote = [
      { id: '31', retailer_id: 'OCULTO' },
      { id: '32', retailer_id: 'OUTRO', custom_label_4: marker },
      { id: '33', retailer_id: 'AMBIGUO', custom_label_4: marker },
    ];
    const plan = planCatalogChanges(empty(), remote, new Map(), {
      scope: new Set([productId]), exclusive: true, retailerOwners,
    });
    expect(plan.changes).toEqual([{ method: 'DELETE', retailer_id: 'OCULTO', data: { id: 'OCULTO' } }]);
  });
});

describe('consultas e confirmação na Graph API', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('percorre a paginação sem seguir a URL fornecida pela Meta', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        data: [{ id: '1', retailer_id: 'SKU-1' }],
        paging: { next: 'https://ignored.example/?after=second' },
      }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: '2', retailer_id: 'SKU-2' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const graph = createCatalogGraph('unit-token', new AbortController().signal);
    await expect(graph.readProducts('1234')).resolves.toHaveLength(2);
    const next = new URL(fetchMock.mock.calls[1][0]);
    expect(next.hostname).toBe('graph.facebook.com');
    expect(next.searchParams.get('after')).toBe('second');
  });

  it('envia o lote sem upsert e identifica a falha individual retornada pela Meta', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ handles: ['batch-unit'] }))
      .mockResolvedValueOnce(Response.json({
        data: [{ handle: 'batch-unit', status: 'finished', errors_total_count: 1, ids_of_invalid_requests: ['SKU-2'] }],
      }));
    vi.stubGlobal('fetch', fetchMock);
    const graph = createCatalogGraph('unit-token', new AbortController().signal);
    const changes = [
      { method: 'DELETE' as const, retailer_id: 'SKU-1', data: { id: 'SKU-1' } },
      { method: 'CREATE' as const, retailer_id: 'SKU-2', data: { id: 'SKU-2' } },
    ];
    const failures = await graph.submit('1234', changes);
    expect([...failures.keys()]).toEqual(['SKU-2']);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/1234\/items_batch$/);
    expect(JSON.parse(request.body)).toEqual({
      item_type: 'PRODUCT_ITEM', allow_upsert: false,
      requests: changes.map(({ method, data }) => ({ method, data })),
    });
  });

  it('aguarda lotes assíncronos por mais de 12 segundos usando intervalos crescentes', async () => {
    vi.useFakeTimers();
    let statusChecks = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.pathname.endsWith('/items_batch')) return Promise.resolve(Response.json({ handles: ['batch-slow'] }));
      if (url.pathname.endsWith('/check_batch_request_status')) {
        statusChecks++;
        return Promise.resolve(Response.json({
          data: [{ handle: 'batch-slow', status: statusChecks <= 8 ? 'in_progress' : 'finished', errors_total_count: 0 }],
        }));
      }
      throw new Error('Rota Graph inesperada: ' + url.pathname);
    });
    vi.stubGlobal('fetch', fetchMock);
    const graph = createCatalogGraph('unit-token', new AbortController().signal);
    const pending = graph.submit('1234', [{ method: 'UPDATE', retailer_id: 'SKU-SLOW', data: { id: 'SKU-SLOW' } }]);

    await vi.advanceTimersByTimeAsync(40_000);

    await expect(pending).resolves.toEqual(new Map());
    expect(statusChecks).toBe(9);
  });
});
