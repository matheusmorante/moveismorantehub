import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../../authenticatedErpRequest.js';
import { verifyMetaAppCredentials } from '../../../../server/secure-api/verifyMetaAppCredentials.js';
import { verifyWhatsAppWebhookSubscription } from '../../../../server/secure-api/verifyWhatsAppWebhookSubscription.js';
import { ensureWhatsAppEchoWebhookSubscription } from '../../../../server/secure-api/ensureWhatsAppEchoWebhookSubscription.js';
import {
  createMetaCatalogBatchHandle,
  parseMetaCatalogBatchHandle,
  planMetaGraphRequest,
  type MetaCatalogTarget,
  type MetaGraphProxyPlan,
  type MetaGraphSettings,
} from '../../../../src/pages/utils/metaService/metaGraphProxyPolicy.js';
import { GRAPH_VERSION, MAX_META_REQUEST_BYTES, bodySize } from '../types.js';

function getMetaGraphSettings(value: unknown): MetaGraphSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const config = value as Record<string, unknown>;
  return {
    phoneNumberId: config.phoneNumberId,
    wabaId: config.wabaId,
    catalogId: config.catalogId,
  };
}

export async function handleMetaGraph(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!metaToken) return res.status(503).json({ error: 'Integração Meta não configurada no servidor.' });
  if (bodySize(req.body) > MAX_META_REQUEST_BYTES) {
    return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });
  }

  const context = await authenticateErpRequest(req, res, {
    includeWhatsAppConfig: req.body?.operation !== 'verify_app_credentials'
      && req.body?.operation !== 'ensure_smb_message_echoes_subscription',
  });
  if (!context) return;
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Solicitação inválida.' });
  }

  if (body.operation === 'verify_app_credentials') {
    if (!hasErpPermission(context, 'manageSettings')) {
      return res.status(403).json({ error: 'Sem permissão para verificar a configuração Meta.' });
    }
    const appId = process.env.WHATSAPP_APP_ID?.trim() || '';
    const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() || '';
    if (!appId || !appSecret) {
      return res.status(503).json({ error: 'Verificação de credenciais Meta indisponível no servidor.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await verifyMetaAppCredentials({
        appId,
        appSecret,
        accessToken: metaToken,
        graphVersion: GRAPH_VERSION,
        signal: controller.signal,
      });
      return res.status(200).json(result);
    } catch {
      return res.status(controller.signal.aborted ? 504 : 502).json({
        error: controller.signal.aborted ? 'A verificação Meta demorou demais.' : 'Não foi possível verificar a configuração Meta.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (body.operation === 'verify_waba_subscription') {
    if (!hasErpPermission(context, 'manageSettings')) {
      return res.status(403).json({ error: 'Sem permissão para verificar a inscrição do webhook.' });
    }
    const appId = process.env.WHATSAPP_APP_ID?.trim() || '';
    const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() || '';
    if (!appId || !appSecret) {
      return res.status(503).json({ error: 'Verificação da inscrição do webhook indisponível no servidor.' });
    }

    const configuredWabaId = getMetaGraphSettings(context.whatsappConfig).wabaId;
    if (typeof configuredWabaId !== 'string' || !configuredWabaId.trim()) {
      return res.status(503).json({ error: 'WABA não configurado no sistema.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await verifyWhatsAppWebhookSubscription({
        appId,
        appSecret,
        accessToken: metaToken,
        wabaId: configuredWabaId,
        graphVersion: GRAPH_VERSION,
        signal: controller.signal,
      });
      return res.status(200).json(result);
    } catch {
      return res.status(controller.signal.aborted ? 504 : 502).json({
        error: controller.signal.aborted ? 'A verificação do webhook demorou demais.' : 'Não foi possível verificar a inscrição do webhook.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (body.operation === 'ensure_smb_message_echoes_subscription') {
    if (!hasErpPermission(context, 'manageSettings')) {
      return res.status(403).json({ error: 'Sem permissão para alterar a inscrição do webhook.' });
    }
    const appId = process.env.WHATSAPP_APP_ID?.trim() || '';
    const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() || '';
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() || '';
    if (!appId || !appSecret || !verifyToken) {
      return res.status(503).json({ error: 'Atualização da inscrição do webhook indisponível no servidor.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const result = await ensureWhatsAppEchoWebhookSubscription({
        appId,
        appSecret,
        verifyToken,
        graphVersion: GRAPH_VERSION,
        signal: controller.signal,
      });
      if (result.valid) return res.status(200).json(result);
      const status = result.reason === 'messages_not_subscribed'
        || result.reason === 'subscription_inactive'
        || result.reason === 'callback_not_allowed'
        || result.reason === 'subscription_not_found'
        ? 409
        : result.reason === 'invalid_input' || result.reason === 'verify_token_missing'
          ? 503
          : 502;
      return res.status(status).json(result);
    } catch {
      return res.status(controller.signal.aborted ? 504 : 502).json({
        error: controller.signal.aborted ? 'A atualização do webhook demorou demais.' : 'Não foi possível atualizar a inscrição do webhook.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  let planEntries: Array<{ target: MetaCatalogTarget; plan: MetaGraphProxyPlan }>;
  try {
    const metaSettings = getMetaGraphSettings(context.whatsappConfig);
    if (body.operation === 'sync_catalog_batch') {
      planEntries = (['whatsapp', 'ads'] as const).map((target) => ({
        target,
        plan: planMetaGraphRequest({ ...body, catalogTarget: target }, metaSettings),
      }));
    } else if (body.operation === 'check_catalog_batch') {
      const batch = parseMetaCatalogBatchHandle(body.handle);
      planEntries = batch.catalogTargets.map((target, index) => ({
        target,
        plan: planMetaGraphRequest({
          ...body,
          handle: batch.handles[index],
          catalogTarget: target,
        }, metaSettings),
      }));
    } else {
      planEntries = [{
        target: 'whatsapp',
        plan: planMetaGraphRequest(body, metaSettings),
      }];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Solicitação inválida.';
    return res.status(message.includes('política da empresa') ? 403 : 400).json({ error: message });
  }
  planEntries = planEntries.filter((entry, index, all) =>
    all.findIndex((candidate) => candidate.plan.path === entry.plan.path) === index
  );
  const plan = planEntries[0].plan;
  if (!hasErpPermission(context, plan.permission)) {
    return res.status(403).json({ error: 'Sem permissão para esta operação Meta.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const outcomes = await Promise.allSettled(planEntries.map(async ({ plan: requestPlan, target }) => {
      const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${requestPlan.path}`, {
        method: requestPlan.method,
        headers: {
          Authorization: `Bearer ${metaToken}`,
          ...(requestPlan.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(requestPlan.body ? { body: JSON.stringify(requestPlan.body) } : {}),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      return { target, response, data };
    }));

    const isCatalogWrite = body.operation === 'sync_catalog_batch';
    const isCatalogStatusCheck = body.operation === 'check_catalog_batch';
    const includePartialResult = isCatalogWrite || (isCatalogStatusCheck && planEntries.length > 1);
    const rejectedIndex = outcomes.findIndex((outcome) => outcome.status === 'rejected');
    if (rejectedIndex >= 0) {
      const partialSuccess = outcomes.some((outcome) =>
        outcome.status === 'fulfilled' && outcome.value.response.ok && !outcome.value.data?.error
      );
      return res.status(controller.signal.aborted ? 504 : 502).json({
        error: {
          message: controller.signal.aborted
            ? 'A solicitação à Meta demorou demais.'
            : 'Não foi possível concluir a operação em um dos catálogos Meta.',
        },
        ...(includePartialResult
          ? { partial_success: partialSuccess, failed_catalog: planEntries[rejectedIndex].target }
          : {}),
      });
    }

    const graphResults = outcomes.flatMap((outcome) =>
      outcome.status === 'fulfilled' ? [outcome.value] : []
    );
    const failedIndex = graphResults.findIndex((result) => !result.response.ok || result.data?.error);
    if (failedIndex >= 0) {
      const failed = graphResults[failedIndex];
      const errorPayload = failed.data && typeof failed.data === 'object' && !Array.isArray(failed.data)
        ? failed.data
        : { error: { message: 'A Meta recusou a solicitação.' } };
      return res.status(failed.response.status).json({
        ...errorPayload,
        ...(includePartialResult
          ? {
              partial_success: graphResults.some((result) =>
                result.response.ok && !result.data?.error
              ),
              failed_catalog: failed.target,
            }
          : {}),
      });
    }

    if (isCatalogWrite) {
      const whatsappHandles = Array.isArray(graphResults.find((result) => result.target === 'whatsapp')?.data?.handles)
        ? graphResults.find((result) => result.target === 'whatsapp')?.data.handles as unknown[]
        : [];
      const adsHandles = Array.isArray(graphResults.find((result) => result.target === 'ads')?.data?.handles)
        ? graphResults.find((result) => result.target === 'ads')?.data.handles as unknown[]
        : [];
      const validHandles = (values: unknown[]) => values.filter(
        (handle): handle is string => typeof handle === 'string' && /^[A-Za-z0-9_=-]{1,512}$/.test(handle)
      );
      const wh = validHandles(whatsappHandles);
      const ads = validHandles(adsHandles);
      const combinedHandles = Array.from({ length: Math.max(wh.length, ads.length) }, (_, index) => {
        const whatsappHandle = wh[index];
        const adsHandle = ads[index];
        if (whatsappHandle && adsHandle) return createMetaCatalogBatchHandle(whatsappHandle, adsHandle);
        if (whatsappHandle) return `wa:${whatsappHandle}`;
        if (adsHandle) return `ads:${adsHandle}`;
        return null;
      }).filter((handle): handle is string => typeof handle === 'string');
      return res.status(200).json({ handles: combinedHandles });
    }

    if (isCatalogStatusCheck) {
      const requestedHandle = String(body.handle || '').trim();
      const statusRows = graphResults.flatMap((result) => {
        const responseData = result.data?.data;
        const rows = Array.isArray(responseData)
          ? responseData
          : responseData && typeof responseData === 'object'
            ? [responseData]
            : [result.data];
        return rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
      });
      const statusValues = statusRows.map((row) => String((row as Record<string, unknown>).status || '').toLowerCase());
      const errors = statusRows.flatMap((row) => {
        const rowErrors = (row as Record<string, unknown>).errors;
        return Array.isArray(rowErrors) ? rowErrors : [];
      });
      const errorsTotal = statusRows.reduce((total, row) => {
        const value = Number((row as Record<string, unknown>).errors_total_count ?? 0);
        return total + (Number.isFinite(value) ? value : 0);
      }, 0);
      const failedStatus = statusValues.find((status) =>
        ['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(status)
      );
      const pendingStatus = statusValues.find((status) => status && status !== 'finished');
      const allFinished = statusValues.length === planEntries.length
        && statusValues.every((value) => value === 'finished');
      const status = failedStatus || (allFinished ? 'finished' : pendingStatus || 'in_progress');
      return res.status(200).json({
        data: [{
          handle: requestedHandle,
          status,
          errors_total_count: errorsTotal,
          errors,
        }],
      });
    }

    return res.status(graphResults[0].response.status).json(graphResults[0].data);
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({
      error: controller.signal.aborted ? 'A solicitação à Meta demorou demais.' : 'Não foi possível consultar a Meta.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
