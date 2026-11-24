import { GRAPH_VERSION } from '../secureIntegrations/types.js';

export interface MetaProduct extends Record<string, unknown> {
  id: string;
  retailer_id: string;
  custom_label_4?: string;
}

export interface CatalogChange {
  method: 'CREATE' | 'UPDATE' | 'DELETE';
  retailer_id: string;
  data: Record<string, unknown>;
}

const PRODUCT_FIELDS = [
  'id', 'retailer_id', 'name', 'description', 'price', 'currency', 'sale_price', 'condition',
  'availability', 'image_url', 'additional_image_urls', 'brand', 'url', 'product_type',
  'retailer_product_group_id', 'custom_label_0', 'custom_label_1', 'custom_label_2', 'custom_label_3',
  'custom_label_4', 'custom_number_4', 'color', 'size', 'material', 'gender',
  'quantity_to_sell_on_facebook', 'visibility',
].join(',');
const BATCH_POLL_DELAY_MS = 800;
const BATCH_POLL_TIMEOUT_MS = 12_000;

interface GraphResponse {
  data?: unknown;
  handles?: unknown;
  error?: { code?: number };
  paging?: { next?: string; cursors?: { after?: string } };
}

export class GraphBatchUnconfirmed extends Error {}
class GraphRequestError extends Error {
  constructor(readonly status: number, code: string) {
    super(`Meta Graph HTTP ${status}${code}.`);
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export function createCatalogGraph(token: string, signal: AbortSignal) {
  async function request(path: string, query?: URLSearchParams, payload?: unknown): Promise<GraphResponse> {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${path}${query ? `?${query}` : ''}`;
    const response = await fetch(url, {
      method: payload ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    });
    const body = await response.json().catch(() => null) as GraphResponse | null;
    if (!response.ok || !body || body.error) {
      const code = Number.isFinite(body?.error?.code) ? `, código ${body?.error?.code}` : '';
      throw new GraphRequestError(response.status, code);
    }
    return body;
  }

  async function* readEdge(path: string, query: URLSearchParams): AsyncGenerator<unknown[]> {
    const cursors = new Set<string>();
    for (;;) {
      const page = await request(path, query);
      if (!Array.isArray(page.data)) throw new Error('A Meta retornou uma página inválida.');
      yield page.data;
      if (!page.paging?.next) return;
      const after = page.paging.cursors?.after || new URL(page.paging.next).searchParams.get('after');
      if (!after || cursors.has(after)) throw new Error('A paginação da Meta não avançou.');
      cursors.add(after);
      query.set('after', after);
    }
  }

  async function readProducts(
    catalogId: string,
    filter?: Record<string, unknown>,
    fields = PRODUCT_FIELDS,
  ): Promise<MetaProduct[]> {
    const query = new URLSearchParams({ fields, limit: '200', bulk_pagination: 'true' });
    if (filter) query.set('filter', JSON.stringify(filter));
    const items: MetaProduct[] = [];
    const seen = new Set<string>();
    for await (const page of readEdge(`${catalogId}/products`, query)) {
      for (const entry of page) {
        const item = entry as MetaProduct | null;
        if (!item || typeof item.retailer_id !== 'string' || !item.retailer_id
          || typeof item.id !== 'string' || !/^\d+$/.test(item.id)) {
          throw new Error('A Meta retornou um item sem identificador válido.');
        }
        if (seen.has(item.id)) throw new Error('A Meta repetiu um item na paginação do catálogo.');
        seen.add(item.id);
        items.push(item);
      }
    }
    return items;
  }

  async function isExclusiveCatalog(catalogId: string, appId: string): Promise<boolean> {
    let exclusive = /^\d+$/.test(appId);
    let sourceCount = 0;
    const query = new URLSearchParams({ fields: 'id,name', limit: '50' });
    for await (const page of readEdge(`${catalogId}/data_sources`, query)) {
      for (const entry of page) {
        const source = entry as { id?: string; name?: string } | null;
        if (!source?.id || typeof source.name !== 'string') {
          throw new Error('A Meta retornou uma fonte de dados sem identificação.');
        }
        exclusive &&= source.name === `App ${appId}`;
        sourceCount++;
      }
    }
    return exclusive && sourceCount === 1;
  }

  async function readRetailers(catalogId: string, ids: string[], fields?: string): Promise<MetaProduct[]> {
    const products: MetaProduct[] = [];
    // O filtro via query string tem seu tamanho limitado. SKUs legados podem ser longos.
    for (let index = 0; index < ids.length; index += 20) {
      const group = ids.slice(index, index + 20);
      const page = await readProducts(catalogId, { retailer_id: { is_any: group } }, fields);
      const matching = new Set(group);
      products.push(...page.filter((item) => matching.has(item.retailer_id)));
    }
    return products;
  }

  async function submit(catalogId: string, changes: CatalogChange[]): Promise<Map<string, string>> {
    let result: GraphResponse;
    try {
      result = await request(`${catalogId}/items_batch`, undefined, {
        item_type: 'PRODUCT_ITEM',
        allow_upsert: false,
        requests: changes.map(({ method, data }) => ({ method, data })),
      });
    } catch (error) {
      if (error instanceof GraphRequestError && error.status >= 400 && error.status < 500) {
        return new Map(changes.map(({ retailer_id }) => [retailer_id, error.message]));
      }
      throw new GraphBatchUnconfirmed(error instanceof Error ? error.message : 'Envio do lote sem confirmação.');
    }
    try {
      if (!Array.isArray(result.handles) || !result.handles.length || result.handles.some(
        (handle) => typeof handle !== 'string' || !/^[A-Za-z0-9_=-]{1,512}$/.test(handle),
      )) {
        throw new Error('A Meta não forneceu um identificador para confirmar o lote.');
      }

      const batches = await Promise.all(result.handles.map((handle) => poll(catalogId, handle, changes)));
      return new Map(batches.flatMap((batch) => [...batch]));
    } catch (error) {
      // Um timeout ou uma resposta inválida pode ocorrer depois de a Meta aceitar o lote.
      // A próxima execução lê a Meta antes de decidir se deve reenviar.
      throw new GraphBatchUnconfirmed(error instanceof Error ? error.message : 'Lote não confirmado pela Meta.');
    }
  }

  async function poll(catalogId: string, handle: string, changes: CatalogChange[]) {
    const deadline = Date.now() + BATCH_POLL_TIMEOUT_MS;
    do {
      const response = await request(`${catalogId}/check_batch_request_status`,
        new URLSearchParams({ handle, load_ids_of_invalid_requests: 'true' }));
      const rows = Array.isArray(response.data) ? response.data : [];
      const row = rows.find((entry) => entry?.handle === handle)
        ?? (rows.length === 1 && !rows[0]?.handle ? rows[0] : null);
      if (!row || typeof row.status !== 'string') throw new Error('Status inválido para o lote Meta.');
      const status = row.status.toLowerCase();
      if (status === 'finished') return failedItems(row, changes);
      if (['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(status)) {
        return new Map(changes.map((change) => [change.retailer_id, `Lote Meta encerrou com status ${status}.`]));
      }
      await sleep(BATCH_POLL_DELAY_MS, signal);
    } while (Date.now() < deadline);
    throw new Error('A Meta ainda não confirmou o lote dentro do tempo limite.');
  }

  return { readProducts, readRetailers, isExclusiveCatalog, submit, sleep: (ms: number) => sleep(ms, signal) };
}

function failedItems(row: Record<string, unknown>, changes: CatalogChange[]): Map<string, string> {
  const requested = new Set(changes.map((change) => change.retailer_id));
  const failures = new Map<string, string>();
  const errors = Array.isArray(row.errors) ? row.errors : [];
  for (const id of Array.isArray(row.ids_of_invalid_requests) ? row.ids_of_invalid_requests : []) {
    if (typeof id === 'string' && requested.has(id)) failures.set(id, 'A Meta recusou o item no lote.');
  }
  let unidentifiedError = false;
  for (const error of errors) {
    const id = error?.id ?? error?.retailer_id;
    if (typeof id !== 'string' || !requested.has(id)) {
      unidentifiedError = true;
      continue;
    }
    const code = typeof error.code === 'number' ? ` (código ${error.code})` : '';
    failures.set(id, `A Meta recusou o item no lote${code}.`);
  }
  if (unidentifiedError || (Number(row.errors_total_count ?? 0) > 0 && !failures.size)) {
    return new Map(changes.map(({ retailer_id }) => [
      retailer_id, failures.get(retailer_id) ?? 'A Meta reportou falhas sem identificar todos os itens.',
    ]));
  }
  return failures;
}
