import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { META_ADS_CREATIVE_CATALOG_ID } from '../../../../shared-utils/metaCatalogIds.js';
import { META_CATALOG_BATCH_LIMIT } from '../../../../shared-utils/metaCatalogBatchPayload.js';
import type { MetaCatalogReconciliationResult } from '../../../../shared-utils/metaCatalogReconciliationResult.js';
import { createCatalogGraph, GraphBatchUnconfirmed, type CatalogChange, type MetaProduct } from './graph.js';
import { ownerOf, ownershipLabel, planCatalogChanges } from './plan.js';
import { loadCandidateRetailers, loadDesiredCatalog, loadVerifiedItems, resolveErpProductIds, type VerifiedItem } from './source.js';

type RunScope = { trigger: 'hourly' | 'manual' }
  | { trigger: 'product'; productId: string }
  | { trigger: 'legacy'; requests: Pick<CatalogChange, 'method' | 'retailer_id'>[] };

type Catalog = { id: string; target: 'whatsapp' | 'ads' };
type Graph = ReturnType<typeof createCatalogGraph>;

interface RunIssue {
  catalog?: Catalog['target'];
  retailerId?: string;
  reason: string;
}

interface CatalogCounters {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  errors: number;
}

export class MetaCatalogSyncBusy extends Error {}

function serviceDb(signal?: AbortSignal) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Acesso servidor ao catálogo do ERP indisponível.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: AbortSignal.any([AbortSignal.timeout(10_000), ...[signal, init?.signal].filter(
          (item): item is AbortSignal => Boolean(item),
        )]),
      }),
    },
  });
}

async function catalogConfig(db: ReturnType<typeof serviceDb>) {
  const { data, error } = await db.from('settings')
    .select('catalogId:data->whatsappConfig->>catalogId,description:data->channelBaseDescriptions->>whatsapp')
    .eq('id', 'app').maybeSingle();
  if (error || !data) throw new Error('Não foi possível ler a configuração do Catálogo Meta.');
  const whatsappId = typeof data.catalogId === 'string' ? data.catalogId.trim() : '';
  if (!whatsappId || !/^\d{1,32}$/.test(whatsappId)) throw new Error('Catálogo do WhatsApp não configurado.');
  const catalogs: Catalog[] = [{ id: whatsappId, target: 'whatsapp' }];
  if (whatsappId !== META_ADS_CREATIVE_CATALOG_ID) {
    catalogs.push({ id: META_ADS_CREATIVE_CATALOG_ID, target: 'ads' });
  }
  return { catalogs, description: data.description as string | null };
}

async function verifyDeletions(graph: Graph, catalog: Catalog, retailerIds: string[]): Promise<Set<string>> {
  let remaining = retailerIds;
  for (const delay of [0, 700, 1_400]) {
    if (!remaining.length) break;
    if (delay) await graph.sleep(delay);
    const products = await graph.readRetailers(catalog.id, remaining, 'id,retailer_id');
    remaining = products.map(({ retailer_id }) => retailer_id);
  }
  return new Set(remaining);
}

async function readScope(
  graph: Graph,
  catalog: Catalog,
  verified: Map<string, VerifiedItem>,
  retailerIds: string[],
  productId?: string,
): Promise<MetaProduct[]> {
  const label = productId ? ownershipLabel(productId) : null;
  const [explicitRetailers, tagged] = await Promise.all([
    graph.readRetailers(catalog.id, [...new Set([...retailerIds, ...verified.keys()])]),
    label ? graph.readProducts(catalog.id, { custom_label_4: { eq: label } }) : [],
  ]);
  return [...explicitRetailers, ...tagged.filter((item) => item.custom_label_4 === label)];
}

export async function getLastMetaCatalogRun(): Promise<MetaCatalogReconciliationResult | null> {
  const { data, error } = await serviceDb().from('meta_catalog_sync_state')
    .select('last_run').eq('singleton', true).maybeSingle();
  if (error) throw new Error('Não foi possível consultar a última sincronização do catálogo.');
  return data?.last_run ?? null;
}

export async function runMetaCatalogReconciliation(scope: RunScope): Promise<MetaCatalogReconciliationResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const full = scope.trigger === 'manual' || scope.trigger === 'hourly';
  const service = serviceDb();
  const leaseToken = randomUUID();
  let claimed = false;
  for (const delay of full ? [0] : [0, 300, 700, 1_200]) {
    if (delay) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    const { data, error } = await service.rpc('claim_meta_catalog_sync', { p_token: leaseToken });
    if (error) throw new Error('Não foi possível obter a trava de sincronização do catálogo.');
    claimed = data === true;
    if (claimed) break;
  }
  if (claimed !== true) throw new MetaCatalogSyncBusy('O Catálogo Meta já está em sincronização. Alterações pendentes serão conferidas na próxima execução.');

  const startedAt = new Date().toISOString();
  const signal = AbortSignal.timeout(full ? 260_000 : 45_000);
  const db = serviceDb(signal);
  const graph = createCatalogGraph(accessToken, signal);
  const counters: CatalogCounters = { created: 0, updated: 0, deleted: 0, unchanged: 0, errors: 0 };
  const issues: RunIssue[] = [];
  let retainLease = false;

  function recordIssue(reason: string, catalog?: Catalog['target'], retailerId?: string) {
    counters.errors++;
    // The complete number is kept even when a widespread outage affects many items.
    if (issues.length < 100) issues.push({ catalog, retailerId, reason });
  }

  async function applyChanges(catalog: Catalog, changes: CatalogChange[]) {
    for (let offset = 0; offset < changes.length; offset += META_CATALOG_BATCH_LIMIT) {
      const batch = changes.slice(offset, offset + META_CATALOG_BATCH_LIMIT);
      let failures: Map<string, string>;
      try {
        signal.throwIfAborted();
        failures = await graph.submit(catalog.id, batch);
      } catch (error) {
        retainLease ||= error instanceof GraphBatchUnconfirmed;
        for (const change of batch) recordIssue(safeReason(error), catalog.target, change.retailer_id);
        continue;
      }
      const deletes = batch.filter((item) => item.method === 'DELETE' && !failures.has(item.retailer_id));
      if (deletes.length) {
        try {
          const remaining = await verifyDeletions(graph, catalog, deletes.map((item) => item.retailer_id));
          for (const retailerId of remaining) failures.set(retailerId, 'A exclusão ainda não foi confirmada na Meta para este SKU.');
        } catch (error) {
          for (const item of deletes) failures.set(item.retailer_id, `Exclusão não confirmada. ${safeReason(error)}`);
        }
      }
      for (const change of batch) {
        const failure = failures.get(change.retailer_id);
        if (failure) recordIssue(failure, catalog.target, change.retailer_id);
        else if (change.method === 'CREATE') counters.created++;
        else if (change.method === 'UPDATE') counters.updated++;
        else counters.deleted++;
      }
    }
  }

  try {
    if (!accessToken) throw new Error('Integração Meta não configurada no servidor.');
    const { catalogs, description } = await catalogConfig(db);
    const requested = scope.trigger === 'legacy'
      ? new Map(scope.requests.map((request) => [request.retailer_id, request.method]))
      : undefined;
    const productId = scope.trigger === 'product' ? scope.productId : undefined;
    const productIds = productId ? [productId] : requested ? await resolveErpProductIds(db, [...requested.keys()]) : undefined;
    const [desired, verified, candidates] = await Promise.all([
      loadDesiredCatalog(db, description, productIds),
      // Older clients can send the SKU of an already purged ERP entry.
      loadVerifiedItems(db, catalogs.map(({ id }) => id), {
        productId, retailerIds: requested ? [...requested.keys()] : undefined,
      }),
      productId ? loadCandidateRetailers(db, productId) : [],
    ]);
    if (requested) {
      for (const retailerId of desired.items.keys()) {
        const method = requested.get(retailerId);
        if (method === 'DELETE') {
          desired.blocked.set(retailerId, 'O SKU ainda está publicado no ERP e não pode ser removido por um lote anterior.');
        }
        if (!method || method === 'DELETE') desired.items.delete(retailerId);
      }
      for (const retailerId of desired.blocked.keys()) {
        if (!requested.has(retailerId)) desired.blocked.delete(retailerId);
      }
      for (const [retailerId, method] of requested) {
        if (method !== 'DELETE' && !desired.items.has(retailerId) && !desired.blocked.has(retailerId)) {
          desired.blocked.set(retailerId, 'O SKU solicitado não corresponde a um item publicado no ERP.');
        }
      }
    }
    const retailerIds = requested ? [...requested.keys()] : [...new Set([...desired.items.keys(), ...candidates])];

    await Promise.all(catalogs.map(async (catalog) => {
      try {
        const trusted = new Map(verified.filter((item) => item.catalog_id === catalog.id)
          .map((item) => [item.retailer_id, item]));
        const remote = full ? await graph.readProducts(catalog.id) : await readScope(graph, catalog, trusted, retailerIds, productId);
        const plan = planCatalogChanges(desired, remote, trusted, {
          scope: productId ? new Set([productId]) : undefined,
          completeSnapshot: full,
        });
        if (productId || requested) {
          const explicit = new Set(retailerIds);
          for (const item of remote) {
            const owner = ownerOf(item, trusted);
            if (explicit.has(item.retailer_id) && (!owner || (productId && owner !== productId)) && !plan.errors.has(item.retailer_id)) {
              plan.errors.set(item.retailer_id, 'Item presente na Meta com origem não comprovada.');
            }
          }
        }
        counters.unchanged += plan.unchanged;
        for (const [retailerId, reason] of plan.errors) recordIssue(reason, catalog.target, retailerId);
        await applyChanges(catalog, plan.changes);
      } catch (error) {
        recordIssue(safeReason(error), catalog.target);
      }
    }));
  } catch (error) {
    recordIssue(safeReason(error));
  }

  const success = counters.errors === 0;
  const result: MetaCatalogReconciliationResult = {
    success,
    ...counters,
    count: counters.created + counters.updated + counters.deleted,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...(success ? {} : { error: `${counters.errors} falha(s) na sincronização. A próxima reconciliação verificará as pendências. ${issues[0].reason}` }),
  };
  const { data: finished, error: finishError } = await service.rpc('finish_meta_catalog_sync', {
    p_token: leaseToken,
    p_full: full,
    p_failed: !success,
    p_run: { ...result, trigger: scope.trigger, issues },
    p_retain_lease: retainLease,
  });
  if (!success) console.warn('[MetaCatalog] Reconciliação com pendências.', { ...result, trigger: scope.trigger, issues });
  if (finishError || finished !== true) throw new Error('Não foi possível registrar o resultado da sincronização.');
  return result;
}

function safeReason(error: unknown): string {
  if (!(error instanceof Error)) return 'Falha ao consultar a Meta ou o catálogo do ERP.';
  if (['TimeoutError', 'AbortError'].includes(error.name)) return 'Tempo limite excedido.';
  return error.message;
}
