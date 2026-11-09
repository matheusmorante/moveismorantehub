import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../../authenticatedErpRequest.js';
import { MAX_ROUTE_REQUEST_BYTES, ROUTES_FIELD_MASK, bodySize } from '../types.js';

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

export async function handleGoogleRoutes(req: VercelRequest, res: VercelResponse): Promise<unknown> {
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
