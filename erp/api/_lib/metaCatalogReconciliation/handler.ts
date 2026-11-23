import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hasErpPermission, type AuthenticatedErpRequest } from '../authenticatedErpRequest.js';
import { planMetaGraphRequest } from '../../../src/pages/utils/metaService/metaGraphProxyPolicy.js';
import type { CatalogChange } from './graph.js';
import { getLastMetaCatalogRun, MetaCatalogSyncBusy, runMetaCatalogReconciliation } from './run.js';
import { UUID } from './source.js';

export const CONFIRMED_LEGACY_HANDLE = 'morantehub-reconciled';

export async function handleMetaCatalogCron(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || process.env.VERCEL_ENV !== 'production') return res.status(503).end();
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(String(req.headers.authorization || ''));
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).end();
  }
  try {
    const result = await runMetaCatalogReconciliation({ trigger: 'hourly' });
    return res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    if (error instanceof MetaCatalogSyncBusy) return res.status(200).json({ skipped: true });
    console.error('[MetaCatalog] A reconciliação horária não pôde ser iniciada ou registrada.');
    return res.status(503).json({ error: 'Reconciliação do Catálogo Meta indisponível.' });
  }
}

export async function handleCatalogOperation(
  body: Record<string, unknown>,
  context: AuthenticatedErpRequest,
  res: VercelResponse,
) {
  const canConfigure = hasErpPermission(context, 'productConfig');
  if (body.operation === 'reconcile_catalog_status') {
    if (!canConfigure && !hasErpPermission(context, 'viewChannelCatalog')) return res.status(403).end();
    const lastRun = await getLastMetaCatalogRun();
    if (!lastRun) return res.status(200).json({ lastRun: null });
    const { startedAt, finishedAt, count, created, updated, deleted, unchanged, errors, success } = lastRun;
    return res.status(200).json({ lastRun: { startedAt, finishedAt, count, created, updated, deleted, unchanged, errors, success } });
  }
  if (!canConfigure) return res.status(403).json({ error: 'Sem permissão para esta operação Meta.' });

  try {
    if (body.operation === 'sync_catalog_batch') {
      let requests: Pick<CatalogChange, 'method' | 'retailer_id'>[];
      try {
        // Valida o contrato usado pelas versões anteriores. Os dados dos itens são lidos no ERP.
        planMetaGraphRequest({ operation: 'sync_catalog_batch', catalogTarget: 'ads', payload: body.payload }, {});
        const input = (body.payload as { requests: CatalogChange[] }).requests;
        requests = input.map(({ retailer_id, method }) => ({ retailer_id, method }));
      } catch {
        return res.status(400).json({ error: 'Lote do catálogo inválido.' });
      }
      const result = await runMetaCatalogReconciliation({ trigger: 'legacy', requests });
      if (!result.success) {
        return res.status(502).json({ error: { message: result.error }, partial_success: result.count > 0 });
      }
      return res.status(200).json({ handles: [CONFIRMED_LEGACY_HANDLE] });
    }

    const productId = body.productId;
    if (productId !== undefined && (typeof productId !== 'string' || !UUID.test(productId))) {
      return res.status(400).json({ error: 'Identificador do produto inválido.' });
    }
    if (!productId && !context.roles.includes('administrator')) {
      return res.status(403).json({ error: 'Apenas administradores podem reconciliar todo o Catálogo Meta.' });
    }
    const result = await runMetaCatalogReconciliation(productId
      ? { trigger: 'product', productId: productId.toLowerCase() }
      : { trigger: 'manual' });
    return res.status(200).json(result);
  } catch (error) {
    const busy = error instanceof MetaCatalogSyncBusy;
    return res.status(busy ? 409 : 503).json({
      error: busy ? error.message : 'Reconciliação do Catálogo Meta indisponível.',
    });
  }
}
