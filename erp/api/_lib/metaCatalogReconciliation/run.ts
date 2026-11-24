import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { META_ADS_CREATIVE_CATALOG_ID, META_WHATSAPP_CATALOG_ID } from '../../../../shared-utils/metaCatalogIds.js';
import { META_CATALOG_BATCH_LIMIT } from '../../../../shared-utils/metaCatalogBatchPayload.js';
import type { MetaCatalogReconciliationResult } from '../../../../shared-utils/metaCatalogReconciliationResult.js';
import { createCatalogGraph, GraphBatchUnconfirmed, type CatalogChange, type MetaProduct } from './graph.js';
import { matchesMetaProduct, ownerOf, ownershipLabel, planCatalogChanges } from './plan.js';
import { confirmDeletionHistory, recordDeletionAttempts } from './deletionHistory.js';
import { loadCandidateRetailers, loadDesiredCatalog, loadRetailerOwners, loadVerifiedItems, type VerifiedItem } from './source.js';

type RunScope = { trigger: 'hourly' | 'manual' }
  | { trigger: 'product'; productId: string }
  | { trigger: 'legacy'; requests: Pick<CatalogChange, 'method' | 'retailer_id'>[] };

type Catalog = { id: string; target: 'whatsapp' | 'ads' };
type Graph = ReturnType<typeof createCatalogGraph>;
const MAX_CATALOG_DELETIONS = 50;
const MIN_DELETIONS_FOR_RATIO_GUARD = 10;
const MAX_CATALOG_DELETION_SHARE = 0.25;

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
  if (![META_WHATSAPP_CATALOG_ID, META_ADS_CREATIVE_CATALOG_ID].includes(whatsappId)) {
    throw new Error('O Catálogo do WhatsApp precisa estar entre os destinos gerenciados pelo ERP.');
  }
  const catalogs: Catalog[] = [{ id: whatsappId, target: 'whatsapp' }];
  if (whatsappId !== META_ADS_CREATIVE_CATALOG_ID) {
    catalogs.push({ id: META_ADS_CREATIVE_CATALOG_ID, target: 'ads' });
  }
  return { catalogs, description: data.description as string | null };
}

async function verifyDeletions(graph: Graph, catalog: Catalog, retailerIds: string[]): Promise<Set<string>> {
  let remaining = retailerIds;
  // A finished batch can take a few more seconds to disappear from Meta's
  // retailer_id lookup. Keep checking the actual catalog before reporting a
  // failed removal, with small bounded reads to limit extra Graph API traffic.
  for (const delay of [0, 700, 1_400, 2_800]) {
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

  async function confirmUncertainWrites(
    catalog: Catalog,
    changes: CatalogChange[],
    failures: Map<string, string>,
  ) {
    const writes = changes.filter(({ method }) => method !== 'DELETE');
    if (!writes.length) return;

    const remote = await graph.readRetailers(catalog.id, writes.map(({ retailer_id }) => retailer_id));
    const matches = new Map<string, MetaProduct[]>();
    for (const item of remote) {
      const items = matches.get(item.retailer_id) ?? [];
      items.push(item);
      matches.set(item.retailer_id, items);
    }
    for (const change of writes) {
      const items = matches.get(change.retailer_id) ?? [];
      if (items.length === 1 && matchesMetaProduct(change.data, items[0])) {
        failures.delete(change.retailer_id);
      } else if (items.length > 1) {
        failures.set(change.retailer_id, 'A Meta retornou mais de um item para o SKU após o lote sem confirmação.');
      } else if (change.method === 'CREATE') {
        failures.set(change.retailer_id, 'A Meta ainda não publicou o item após o lote sem confirmação.');
      } else {
        failures.set(change.retailer_id, 'A Meta ainda não refletiu a atualização do SKU após o lote sem confirmação.');
      }
    }
  }

  async function applyChanges(catalog: Catalog, changes: CatalogChange[]) {
    for (let offset = 0; offset < changes.length; offset += META_CATALOG_BATCH_LIMIT) {
      let batch = changes.slice(offset, offset + META_CATALOG_BATCH_LIMIT);
      let retailerIds = batch.filter(({ method }) => method === 'DELETE').map(({ retailer_id }) => retailer_id);
      if (retailerIds.length) {
        try {
          await recordDeletionAttempts(db, {
            runId: leaseToken, catalogId: catalog.id, retailerIds, trigger: scope.trigger,
          });
        } catch (error) {
          for (const id of retailerIds) recordIssue(safeReason(error), catalog.target, id);
          batch = batch.filter(({ method }) => method !== 'DELETE');
          retailerIds = [];
        }
      }
      if (!batch.length) continue;

      let failures: Map<string, string>;
      let unconfirmed = false;
      try {
        signal.throwIfAborted();
        failures = await graph.submit(catalog.id, batch);
      } catch (error) {
        unconfirmed = error instanceof GraphBatchUnconfirmed;
        failures = new Map(batch.map(({ retailer_id }) => [retailer_id, safeReason(error)]));
        if (unconfirmed) {
          try {
            await confirmUncertainWrites(catalog, batch, failures);
          } catch (verificationError) {
            const reason = `A leitura de confirmação dos SKUs também falhou: ${safeReason(verificationError)}`;
            for (const change of batch) {
              if (change.method !== 'DELETE') failures.set(change.retailer_id, `${failures.get(change.retailer_id)} ${reason}`);
            }
          }
        }
      }
      if (retailerIds.length) {
        let confirmed: string[] = [];
        try {
          const remaining = await verifyDeletions(graph, catalog, retailerIds);
          confirmed = retailerIds.filter((id) => !remaining.has(id));
          for (const id of confirmed) failures.delete(id);
          for (const id of remaining) {
            if (!failures.has(id)) failures.set(id, 'A exclusão ainda não foi confirmada na Meta para este SKU.');
          }
        } catch (error) {
          for (const id of retailerIds) {
            const batchFailure = failures.get(id);
            failures.set(id, batchFailure
              ? `${batchFailure} A consulta de confirmação também falhou: ${safeReason(error)}`
              : `Exclusão não confirmada. ${safeReason(error)}`);
          }
        }
        if (confirmed.length) {
          try {
            await confirmDeletionHistory(db, { runId: leaseToken, catalogId: catalog.id, retailerIds: confirmed });
          } catch (error) {
            for (const id of confirmed) recordIssue(safeReason(error), catalog.target, id);
          }
        }
      }
      retainLease ||= unconfirmed && failures.size > 0;
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
    const appId = process.env.WHATSAPP_APP_ID?.trim() ?? '';
    const [completeDesired, productDesired, destinations] = await Promise.all([
      full ? loadDesiredCatalog(db, description) : null,
      productId ? loadDesiredCatalog(db, description, [productId], productId) : null,
      Promise.all(catalogs.map(async (catalog) => ({
        catalog,
        exclusive: await graph.isExclusiveCatalog(catalog.id, appId),
      }))),
    ]);
    let candidates = productDesired?.candidateRetailers ?? null;
    if (productId && candidates === null) candidates = await loadCandidateRetailers(db, productId);
    const retailerIds = requested ? [...requested.keys()] : candidates ?? [];
    const verified = !full || destinations.some(({ exclusive }) => !exclusive)
      ? await loadVerifiedItems(db, catalogs.map(({ id }) => id), {
        productId, retailerIds: requested ? retailerIds : undefined,
      })
      : [];
    const snapshots = await Promise.all(destinations.map(async ({ catalog, exclusive }) => {
      const trusted = new Map(verified.filter((item) => item.catalog_id === catalog.id)
        .map((item) => [item.retailer_id, item]));
      const remote = full
        ? await graph.readProducts(catalog.id)
        : await readScope(graph, catalog, trusted, retailerIds, productId);
      return { catalog, exclusive, trusted, remote };
    }));

    // Find other local owners before a scoped request can replace or remove a reused SKU.
    const retailerOwners = full ? undefined : await loadRetailerOwners(db, [...new Set([
      ...retailerIds, ...snapshots.flatMap(({ remote }) => remote.map((item) => item.retailer_id)),
    ])]);
    const scopedProductIds = new Set(productId ? [productId] : []);
    if (retailerOwners) for (const owners of retailerOwners.values()) {
      for (const id of owners) scopedProductIds.add(id);
    }
    if (requested) for (const { remote, trusted } of snapshots) {
      for (const item of remote) {
        const id = ownerOf(item, trusted);
        if (id) scopedProductIds.add(id);
      }
    }
    const additionalProductIds = productDesired
      ? [...scopedProductIds].filter((id) => id !== productId)
      : [...scopedProductIds];
    const desired = completeDesired ?? productDesired ?? await loadDesiredCatalog(db, description, additionalProductIds);
    if (!completeDesired && productDesired && additionalProductIds.length > 0) {
      const additionalDesired = await loadDesiredCatalog(db, description, additionalProductIds);
      for (const [retailerId, reason] of additionalDesired.blocked) {
        desired.items.delete(retailerId);
        desired.blocked.set(retailerId, reason);
      }
      for (const [retailerId, item] of additionalDesired.items) {
        if (desired.blocked.has(retailerId)) continue;
        if (desired.items.has(retailerId)) {
          desired.items.delete(retailerId);
          desired.blocked.set(retailerId, 'Identificador compartilhado por mais de um item do ERP.');
        } else {
          desired.items.set(retailerId, item);
        }
      }
    }
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
    const plans = snapshots.map(({ catalog, exclusive, trusted, remote }) => {
      const plan = planCatalogChanges(desired, remote, trusted, {
        scope: productId ? new Set([productId]) : undefined,
        completeSnapshot: full,
        exclusive,
        retailerOwners,
        explicitRetailers: full ? undefined : new Set(retailerIds),
      });
      const deleteCount = plan.changes.filter(({ method }) => method === 'DELETE').length;
      const exceedsShare = full && deleteCount >= MIN_DELETIONS_FOR_RATIO_GUARD
        && deleteCount > remote.length * MAX_CATALOG_DELETION_SHARE;
      if (deleteCount > MAX_CATALOG_DELETIONS || exceedsShare) {
        recordIssue(`Exclusão em massa bloqueada. A execução planejou remover ${deleteCount} de ${remote.length} itens consultados.`, catalog.target);
        plan.changes = plan.changes.filter(({ method }) => method !== 'DELETE');
      }
      return { catalog, plan };
    });
    await Promise.all(plans.map(async ({ catalog, plan }) => {
      try {
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
