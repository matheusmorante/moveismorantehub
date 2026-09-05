import { supabase } from '../../../services/supabaseClient';
import { MobileApiUsageTracker } from '../../../services/apiUsageTracker';

export interface RouteComputationResult {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  coordinates: { latitude: number; longitude: number }[];
}

// Cache em memória para evitar chamadas duplicadas da Routes API
const routesCache = new Map<string, { result: RouteComputationResult; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Decodifica uma encoded polyline do Google Maps em uma lista de coordenadas { latitude, longitude }
 */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Obtém a chave do Google Maps configurada no banco (settings)
 */
export async function getGoogleApiKey(): Promise<string | null> {
  try {
    const { data } = await supabase.from('settings').select('data').limit(1).maybeSingle();
    const key = data?.data?.googleMapsApiKey;
    return key || 'AIzaSyCROtDtnGmCBnzSiTA2sJTmoEnTsGMf6Qk';
  } catch {
    return 'AIzaSyCROtDtnGmCBnzSiTA2sJTmoEnTsGMf6Qk';
  }
}

/**
 * Calcula trajeto, distância e polyline entre origem e destino via Google Maps Routes API v2
 */
export async function computeRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<RouteComputationResult | null> {
  // Arredonda coordenadas para ~100m para chave de cache
  const cacheKey = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}->${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
  const cached = routesCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    void MobileApiUsageTracker.record({
      provider: 'google',
      service: 'google_routes',
      operation: 'compute_routes_v2',
      units: 1,
      status: 'SUCCESS',
      cache_hit: true,
      module_source: 'mobile_map_navigation',
    });
    return cached.result;
  }

  const apiKey = await getGoogleApiKey();
  if (!apiKey) {
    console.warn('[RoutesService] Chave de API Google Maps não encontrada.');
    return null;
  }

  const startTime = Date.now();
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    languageCode: 'pt-BR',
    units: 'METRIC',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[RoutesService] Erro da API Google Routes:', response.status, errText);
      void MobileApiUsageTracker.record({
        provider: 'google',
        service: 'google_routes',
        operation: 'compute_routes_v2',
        units: 1,
        status: 'ERROR',
        http_status: response.status,
        response_time_ms: elapsed,
        module_source: 'mobile_map_navigation',
        error_message: errText.slice(0, 200),
      });
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distanceMeters || 0);
    // duration vem no formato string "1234s"
    const durationSeconds = route.duration ? parseInt(route.duration.replace('s', ''), 10) : 0;
    const encodedPolyline = route.polyline?.encodedPolyline || '';
    const coordinates = encodedPolyline ? decodePolyline(encodedPolyline) : [];

    const result: RouteComputationResult = {
      distanceMeters,
      durationSeconds,
      distanceKm: Number((distanceMeters / 1000).toFixed(1)),
      durationMinutes: Math.ceil(durationSeconds / 60),
      coordinates,
    };

    routesCache.set(cacheKey, { result, timestamp: Date.now() });

    void MobileApiUsageTracker.record({
      provider: 'google',
      service: 'google_routes',
      operation: 'compute_routes_v2',
      units: 1,
      status: 'SUCCESS',
      http_status: 200,
      response_time_ms: elapsed,
      module_source: 'mobile_map_navigation',
    });

    return result;
  } catch (error) {
    console.warn('[RoutesService] Falha na requisição computeRoutes:', error);
    void MobileApiUsageTracker.record({
      provider: 'google',
      service: 'google_routes',
      operation: 'compute_routes_v2',
      units: 1,
      status: 'ERROR',
      response_time_ms: Date.now() - startTime,
      module_source: 'mobile_map_navigation',
      error_message: String(error).slice(0, 200),
    });
    return null;
  }
}
