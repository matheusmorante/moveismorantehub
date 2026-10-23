import CustomerData from '../../types/customerData.type';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { stringifyMapAddress } from '../formatters';
import { parseCoordinatesFromMapsUrl } from '../mapCoordinates';
import { getSettings } from '../settingsService';
import { geocodeAddress } from './addressGeocoding';
import { loadGoogleMapsApi } from './googleMapsLoader';

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  destinationCoords: [number, number]; // [lng, lat] (MapLibre/GeoJSON format)
  routeGeoJSON: any; // GeoJSON geometry from Google Maps Directions
}

type GoogleRouteResult = { distanceKm: number; durationMinutes: number; geometry: any };
const routeRequests = new Map<string, Promise<GoogleRouteResult | null>>();
const routeCache = new Map<string, { result: GoogleRouteResult; timestamp: number }>();
const ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas de cache em memória

export const clearRouteCache = () => {
  routeRequests.clear();
  routeCache.clear();
};

export const getShippingRouteUrl = (fullAddress: CustomerData['fullAddress'] | any): string => {
  const explicitUrl = fullAddress?.mapsUrl || fullAddress?.googleMapsUrl || fullAddress?.mapsLink;
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim().length > 5) {
    return explicitUrl.trim();
  }

  const settings = getSettings();
  const originString = settings.companyAddress;
  const destinationString = stringifyMapAddress(fullAddress);

  const originURI = encodeURIComponent(originString);
  const destinationURI = encodeURIComponent(destinationString);

  return `https://www.google.com/maps/dir/?api=1&origin=${originURI}&destination=${destinationURI}&travelmode=driving`;
};

export const calculateRouteViaGoogleMaps = async (
  origin: [number, number],
  destination: [number, number],
  onFailure?: (reason: string) => void
): Promise<GoogleRouteResult | null> => {
  const routeKey = [...origin, ...destination]
    .map((coordinate) => Number(coordinate).toFixed(4))
    .join('|');

  const cached = routeCache.get(routeKey);
  if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL_MS) {
    return cached.result;
  }

  const existingRequest = routeRequests.get(routeKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const guard = await ApiUsageGuard.check('google_routes');
    if (!guard.allowed) {
      console.warn(`[ApiUsageGuard] Cálculo de rota bloqueado: ${guard.reason}`);
      onFailure?.(`O cálculo da rota foi bloqueado: ${guard.reason}`);
      return null;
    }

    const startTime = Date.now();
    try {
      await loadGoogleMapsApi();
      const googleMaps = (window as any).google.maps;
      const { Route } = await googleMaps.importLibrary('routes');
      const routeRequest = {
        origin: { lat: origin[1], lng: origin[0] },
        destination: { lat: destination[1], lng: destination[0] },
        travelMode: 'DRIVING',
        region: 'br',
        fields: ['distanceMeters', 'durationMillis', 'path'],
      };
      const { routes } = await Route.computeRoutes(routeRequest);

      if (routes?.length) {
        const route = routes[0];
        const distanceMeters = Number(route.distanceMeters);
        const durationMillis = Number(route.durationMillis);
        const path = Array.isArray(route.path) ? route.path : [];
        if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationMillis) || !path.length) {
          throw new Error('Google Routes API retornou uma rota sem distância, duração ou caminho.');
        }
        const distanceKm = Number((distanceMeters / 1000).toFixed(1));
        const durationMinutes = Math.ceil(durationMillis / 60_000);

        ApiUsageTracker.record({
          provider: 'google',
          service: 'google_routes',
          operation: 'compute_routes',
          units: 1,
          status: 'SUCCESS',
          response_time_ms: Date.now() - startTime,
          module_source: 'logistics',
        });

        const routeResult: GoogleRouteResult = {
          distanceKm,
          durationMinutes,
          geometry: {
            type: 'LineString',
            coordinates: path.map((point: any) => [
              typeof point.lng === 'function' ? point.lng() : point.lng,
              typeof point.lat === 'function' ? point.lat() : point.lat,
            ]),
          },
        };

        routeCache.set(routeKey, { result: routeResult, timestamp: Date.now() });
        return routeResult;
      }
      throw new Error('Google Routes API não encontrou uma rota dirigível.');
    } catch (e) {
      onFailure?.(`O Google Routes API recusou ou não encontrou uma rota dirigível: ${String(e)}`);
      console.error(
        'Google Routes API error. Verifique se Routes API está habilitada, se a chave permite este domínio e se o faturamento do projeto está ativo:',
        e
      );
      ApiUsageTracker.record({
        provider: 'google',
        service: 'google_routes',
        operation: 'compute_routes',
        units: 1,
        status: 'ERROR',
        response_time_ms: Date.now() - startTime,
        module_source: 'logistics',
        error_message: String(e),
      });
    }
    return null;
  })();

  routeRequests.set(routeKey, request);
  try {
    return await request;
  } finally {
    if (routeRequests.get(routeKey) === request) routeRequests.delete(routeKey);
  }
};

export const autoCalculateRouteDistance = async (
  address: CustomerData['fullAddress'] | any,
  onFailure?: (reason: string) => void
): Promise<RouteResult | null> => {
  try {
    const settings = getSettings();
    const origin: [number, number] = settings.storeOriginCoords || [-49.16948, -25.35205];

    console.info('[autoCalculateRouteDistance] Iniciando cálculo de distância para:', address);

    let destCoords: [number, number] | null = null;

    // PRIORIDADE 1: Coordenadas diretas informadas no endereço (ex: coordenadas preservadas do autocomplete)
    if (
      typeof address === 'object' &&
      Array.isArray(address?.coords) &&
      address.coords.length === 2 &&
      Number.isFinite(address.coords[0]) &&
      Number.isFinite(address.coords[1]) &&
      (address.coords[0] !== 0 || address.coords[1] !== 0)
    ) {
      destCoords = [Number(address.coords[0]), Number(address.coords[1])];
      console.info(
        '[autoCalculateRouteDistance] Coordenadas diretas do endereço priorizadas:',
        destCoords
      );
    }

    // PRIORIDADE 2: Tenta extrair coordenadas da URL de localização do pedido/cliente se informada
    if (!destCoords) {
      const mapsUrl =
        typeof address === 'object'
          ? address?.mapsUrl || address?.googleMapsUrl || address?.mapsLink
          : null;
      if (mapsUrl) {
        const parsed = parseCoordinatesFromMapsUrl(mapsUrl);
        if (parsed) {
          destCoords = [parsed.longitude, parsed.latitude];
          console.info(
            '[autoCalculateRouteDistance] Coordenadas da URL de localização priorizadas:',
            destCoords
          );
        }
      }
    }

    // PRIORIDADE 3: Geocodificação pelo endereço principal (rua, número, cidade e UF)
    if (!destCoords) {
      const geoRes = await geocodeAddress(address, onFailure);
      if (!geoRes) {
        console.warn(
          '[autoCalculateRouteDistance] Geocodificação retornou nulo para o endereço:',
          address
        );
        return null;
      }
      destCoords = geoRes.coords;
    }

    console.info(
      '[autoCalculateRouteDistance] Coordenadas de destino resolvidas:',
      destCoords,
      'Calculando rota de:',
      origin
    );
    const routeData = await calculateRouteViaGoogleMaps(origin, destCoords, onFailure);
    if (!routeData) {
      console.warn(
        '[autoCalculateRouteDistance] Routes API não encontrou rota viável para as coordenadas:',
        destCoords
      );
      return null;
    }

    console.info(
      `[autoCalculateRouteDistance] Sucesso! Distância: ${routeData.distanceKm} km, Duração: ${routeData.durationMinutes} min`
    );
    return {
      distanceKm: routeData.distanceKm,
      durationMinutes: routeData.durationMinutes,
      destinationCoords: destCoords,
      routeGeoJSON: routeData.geometry,
    };
  } catch (error) {
    console.error('Erro ao calcular distância via Google Maps:', error);
    onFailure?.(`Erro na integração com o Google Maps: ${String(error)}`);
    return null;
  }
};
