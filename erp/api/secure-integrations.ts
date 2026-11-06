import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from './_lib/authenticatedErpRequest.js';
import { verifyMetaAppCredentials } from '../server/secure-api/verifyMetaAppCredentials.js';
import { verifyWhatsAppWebhookSubscription } from '../server/secure-api/verifyWhatsAppWebhookSubscription.js';
import { ensureWhatsAppEchoWebhookSubscription } from '../server/secure-api/ensureWhatsAppEchoWebhookSubscription.js';
import {
  createMetaCatalogBatchHandle,
  parseMetaCatalogBatchHandle,
  planMetaGraphRequest,
  type MetaCatalogTarget,
  type MetaGraphProxyPlan,
  type MetaGraphSettings,
} from '../src/pages/utils/metaService/metaGraphProxyPolicy.js';

const MAX_META_REQUEST_BYTES = 1_000_000;
const MAX_GEMINI_REQUEST_BYTES = 1_000_000;
const MAX_ROUTE_REQUEST_BYTES = 16_000;
const MODEL_PATTERN = /^gemini-[a-z0-9][a-z0-9.-]{0,100}$/i;
const ALLOWED_GEMINI_FIELDS = new Set(['content', 'contents', 'generationConfig', 'tools', 'toolConfig', 'systemInstruction']);
const ROUTES_FIELD_MASK = 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline';
const GRAPH_VERSION = 'v26.0';

type SecureOperation = 'meta-graph' | 'gemini-proxy' | 'google-routes';

function bodySize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8');
}

function getOperation(req: VercelRequest): string {
  const value = req.query?.operation;
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function getMetaGraphSettings(value: unknown): MetaGraphSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const config = value as Record<string, unknown>;
  return {
    phoneNumberId: config.phoneNumberId,
    wabaId: config.wabaId,
    catalogId: config.catalogId,
  };
}

function validPoint(value: unknown): value is { latitude: number; longitude: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.latitude === 'number' && Number.isFinite(point.latitude) &&
    point.latitude >= -90 && point.latitude <= 90 &&
    typeof point.longitude === 'number' && Number.isFinite(point.longitude) &&
    point.longitude >= -180 && point.longitude <= 180
  );
}

async function handleMetaGraph(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!metaToken) return res.status(503).json({ error: 'Integração Meta não configurada no servidor.' });
  if (bodySize(req.body) > MAX_META_REQUEST_BYTES) {
    return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });
  }

  const context = await authenticateErpRequest(req, res);
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

    const { data: settings, error: settingsError } = await context.userDb
      .from('settings')
      .select('whatsappConfig:data->whatsappConfig')
      .eq('id', 'app')
      .maybeSingle();
    if (settingsError) return res.status(503).json({ error: 'Não foi possível carregar a configuração Meta.' });
    const configuredWabaId = getMetaGraphSettings(settings?.whatsappConfig).wabaId;
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

  const { data: settings, error: settingsError } = await context.userDb
    .from('settings')
    .select('whatsappConfig:data->whatsappConfig')
    .eq('id', 'app')
    .maybeSingle();
  if (settingsError) return res.status(503).json({ error: 'Não foi possível carregar a configuração Meta.' });

  let planEntries: Array<{ target: MetaCatalogTarget; plan: MetaGraphProxyPlan }>;
  try {
    const metaSettings = getMetaGraphSettings(settings?.whatsappConfig);
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

async function handleGemini(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.GEMINI_API_KEY?.trim()) return res.status(503).json({ error: 'IA indisponível no servidor.' });
  if (bodySize(req.body) > MAX_GEMINI_REQUEST_BYTES) {
    return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });
  }

  const context = await authenticateErpRequest(req, res);
  if (!context) return;
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Solicitação inválida.' });
  }
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  const action = body.action;
  const payload = body.payload;
  if (!MODEL_PATTERN.test(model) || !['generateContent', 'embedContent'].includes(action)) {
    return res.status(400).json({ error: 'Modelo ou operação de IA não permitido.' });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Conteúdo de IA inválido.' });
  }
  if (Object.keys(payload).some((key) => !ALLOWED_GEMINI_FIELDS.has(key))) {
    return res.status(400).json({ error: 'Campo de IA não permitido.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${action}?key=${encodeURIComponent(process.env.GEMINI_API_KEY.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({ error: 'Não foi possível consultar o serviço de IA.' });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleGoogleRoutes(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return res.status(503).json({ error: 'Cálculo de rota indisponível no servidor.' });
  if (bodySize(req.body) > MAX_ROUTE_REQUEST_BYTES) {
    return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });
  }

  const context = await authenticateErpRequest(req, res);
  if (!context) return;
  if (!hasErpPermission(context, 'viewDeliverySchedule')) {
    return res.status(403).json({ error: 'Sem permissão para calcular rotas.' });
  }
  const { origin, destination } = req.body || {};
  if (!validPoint(origin) || !validPoint(destination)) {
    return res.status(400).json({ error: 'Coordenadas de rota inválidas.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': ROUTES_FIELD_MASK,
      },
      body: JSON.stringify({
        origin, destination, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false, languageCode: 'pt-BR', units: 'METRIC',
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({ error: 'Não foi possível calcular a rota.' });
  } finally {
    clearTimeout(timeout);
  }
}

const operations: Record<SecureOperation, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
  'meta-graph': handleMetaGraph,
  'gemini-proxy': handleGemini,
  'google-routes': handleGoogleRoutes,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const operation = getOperation(req) as SecureOperation;
  if (!Object.prototype.hasOwnProperty.call(operations, operation)) {
    return res.status(404).json({ error: 'Operação segura não encontrada.' });
  }
  const operationHandler = operations[operation];
  return operationHandler(req, res);
}
