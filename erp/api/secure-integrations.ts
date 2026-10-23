import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from './_lib/authenticatedErpRequest.js';
import { planMetaGraphRequest, type MetaGraphSettings } from '../src/pages/utils/metaService/metaGraphProxyPolicy.js';

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
  const { data: settings, error: settingsError } = await context.userDb
    .from('settings')
    .select('whatsappConfig:data->whatsappConfig')
    .eq('id', 'app')
    .maybeSingle();
  if (settingsError) return res.status(503).json({ error: 'Não foi possível carregar a configuração Meta.' });

  let plan;
  try {
    plan = planMetaGraphRequest(body, getMetaGraphSettings(settings?.whatsappConfig));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Solicitação inválida.';
    return res.status(message.includes('política da empresa') ? 403 : 400).json({ error: message });
  }
  if (!hasErpPermission(context, plan.permission)) {
    return res.status(403).json({ error: 'Sem permissão para esta operação Meta.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${plan.path}`, {
      method: plan.method,
      headers: {
        Authorization: `Bearer ${metaToken}`,
        ...(plan.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(plan.body ? { body: JSON.stringify(plan.body) } : {}),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
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
