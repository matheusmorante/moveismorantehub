import { supabase } from '../supabaseConfig';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { normalizeUf, parseAddressPrediction } from '../addressParsing';
import { getSettings } from '../settingsService';
import { geocodeCache } from './addressGeocoding';
import { loadGoogleMapsApi } from './googleMapsLoader';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const searchAddressSuggestionsRequest = async (
  query: string,
  city: string | undefined,
  state: string,
  isActive: () => boolean
): Promise<any[]> => {
  if (!query || query.trim().length < 2) return [];

  const settings = getSettings();
  const stateTarget = (state || 'PR').trim().toUpperCase();
  const stateLabel = stateTarget === 'PR' ? 'Paraná' : stateTarget;
  const cleanQuery = query
    .replace(
      /^(rua|travessa|avenida|trav|r\.|av\.|aven|rod\.|rodovia|prefeito|pref\.|gov\.|governador|pres\.|presidente)\s+/i,
      ''
    )
    .replace(/\s(da|do|de|das|dos|d')\s/gi, ' ')
    .trim();

  const cacheQueryKey = `v6_street_${stateTarget.toLowerCase()}_${cleanQuery.toLowerCase()}_${(city || '').toLowerCase()}`;

  try {
    const { data, error } = await supabase
      .from('address_cache')
      .select('results')
      .eq('query_key', cacheQueryKey)
      .single();
    if (!isActive()) return [];
    if (!error && data && data.results && data.results.length > 0) {
      ApiUsageTracker.record({
        provider: 'google',
        service: 'google_places',
        operation: 'autocomplete_cache_hit',
        units: 1,
        status: 'SUCCESS',
        cache_hit: true,
        module_source: 'registrations',
      });
      return data.results;
    }
  } catch {
    /* no-op: intencionalmente silencioso */
  }

  if (!isActive()) return [];
  const guard = await ApiUsageGuard.check('google_places');
  if (!isActive()) return [];
  if (!guard.allowed) {
    console.warn(`[ApiUsageGuard] Busca de sugestões bloqueada: ${guard.reason}`);
    return [];
  }

  const startTime = Date.now();

  try {
    await loadGoogleMapsApi();
    if (!isActive()) return [];
    const google = (window as any).google;

    if (google?.maps?.places?.AutocompleteService) {
      try {
        const autocompleteService = new google.maps.places.AutocompleteService();
        const originCoords = settings.storeOriginCoords || [-49.16948, -25.35205];
        const locationLatLng = google?.maps?.LatLng
          ? new google.maps.LatLng(originCoords[1], originCoords[0])
          : undefined;

        const searchInput = city
          ? `${query.trim()}, ${city}, ${stateLabel}`
          : `${query.trim()}, ${stateLabel}`;

        const predictions: any[] = await new Promise((resolve) => {
          const reqOpts: any = {
            input: searchInput,
            types: ['address'],
            componentRestrictions: { country: 'br' },
          };
          if (locationLatLng) {
            reqOpts.location = locationLatLng;
            reqOpts.radius = 60000; // 60 km ao redor da loja
          }

          autocompleteService.getPlacePredictions(reqOpts, (res: any, status: any) => {
            if (!isActive()) { resolve([]); return; }
            const isOk =
              status === 'OK' || status === google?.maps?.places?.PlacesServiceStatus?.OK;
            if (isOk && res && res.length > 0) {
              resolve(res);
            } else {
              if (status !== 'ZERO_RESULTS') {
                console.error(
                  `[Google Maps Places] Busca de endereços falhou (${status}). Confira se Places API está habilitada, a chave permite este domínio e o faturamento está ativo.`
                );
              }
              resolve([]);
            }
          });
        });

        if (!isActive()) return [];
        if (predictions && predictions.length > 0) {
          const streetPredictions = predictions.filter((pred: any) => {
            const types = pred.types || [];
            const isEstablishment = types.some((t: string) =>
              [
                'establishment',
                'point_of_interest',
                'store',
                'restaurant',
                'food',
                'lodging',
              ].includes(t)
            );
            return !isEstablishment;
          });

          const placesMapped = (streetPredictions.length > 0 ? streetPredictions : predictions).map(
            (pred: any) => {
              const parsed = parseAddressPrediction(pred, city, stateTarget);

              return {
                display_name: pred.description,
                place_id: pred.place_id,
                lat: 0,
                lon: 0,
                address: {
                  road: parsed.road,
                  suburb: parsed.neighborhood,
                  neighbourhood: parsed.neighborhood,
                  city: parsed.city,
                  state: parsed.state,
                  postcode: '',
                },
              };
            }
          );

          if (placesMapped.length > 0) {
            supabase
              .from('address_cache')
              .upsert({
                query_key: cacheQueryKey,
                results: placesMapped,
              })
              .then(
                () => {},
                () => {}
              );
          }

          ApiUsageTracker.record({
            provider: 'google',
            service: 'google_places',
            operation: 'places_autocomplete',
            units: 1,
            status: 'SUCCESS',
            cache_hit: false,
            response_time_ms: Date.now() - startTime,
            module_source: 'registrations',
          });

          return placesMapped;
        }
      } catch (autoErr) {
        if (!isActive()) return [];
        console.warn('Places AutocompleteService warning:', autoErr);
      }
    }
  } catch (error) {
    if (!isActive()) return [];
    console.error('Erro na API do Google Maps:', error);
    ApiUsageTracker.record({
      provider: 'google',
      service: 'google_places',
      operation: 'search_address',
      units: 1,
      status: 'ERROR',
      cache_hit: false,
      response_time_ms: Date.now() - startTime,
      module_source: 'registrations',
      error_message: String(error),
    });
  }

  return [];
};

const fetchPlaceDetailsRequest = async (
  placeId: string,
  isActive: () => boolean
): Promise<any | null> => {
  if (!placeId) return null;
  const guard = await ApiUsageGuard.check('google_places');
  if (!isActive()) return null;
  if (!guard.allowed) {
    console.warn(`[ApiUsageGuard] Detalhes de lugar bloqueados: ${guard.reason}`);
    return null;
  }

  const startTime = Date.now();

  try {
    await loadGoogleMapsApi();
    if (!isActive()) return null;
    const google = (window as any).google;
    const geocoder = new google.maps.Geocoder();

    const r: any = await new Promise((resolve, reject) => {
      geocoder.geocode({ placeId }, (results: any, status: any) => {
        if (!isActive()) { resolve(null); return; }
        if (status === 'OK' && results && results.length > 0) resolve(results[0]);
        else reject(status);
      });
    });

    if (!isActive()) return null;
    if (r) {
      ApiUsageTracker.record({
        provider: 'google',
        service: 'google_places',
        operation: 'place_details',
        units: 1,
        status: 'SUCCESS',
        response_time_ms: Date.now() - startTime,
        module_source: 'registrations',
      });
      const getComponent = (type: string, useShort = false) => {
        const comp = r.address_components?.find((c: any) => c.types.includes(type));
        return comp ? (useShort ? comp.short_name : comp.long_name) : '';
      };

      const rawState =
        getComponent('administrative_area_level_1', true) ||
        getComponent('administrative_area_level_1') ||
        'PR';
      const state = normalizeUf(rawState);

      const neighborhood =
        getComponent('sublocality_level_1') ||
        getComponent('sublocality') ||
        getComponent('neighborhood') ||
        '';

      const city = getComponent('administrative_area_level_2') || getComponent('locality') || '';

      const coords: [number, number] = [
        typeof r.geometry.location.lng === 'function'
          ? r.geometry.location.lng()
          : r.geometry.location.lng,
        typeof r.geometry.location.lat === 'function'
          ? r.geometry.location.lat()
          : r.geometry.location.lat,
      ];

      const street = getComponent('route') || r.formatted_address.split(',')[0];
      const number = getComponent('street_number') || '';
      const cep = (getComponent('postal_code') || '').replace(/\D/g, '');

      // Alimenta imediatamente o cache de geocodificação para que a chamada no pedido
      // encontre as coordenadas instantaneamente sem falhar
      const cacheEntries = [
        [street, city, state, 'Brasil'].filter(Boolean).join(', '),
        [street, neighborhood, city, state, 'Brasil'].filter(Boolean).join(', '),
        r.formatted_address,
      ];
      cacheEntries.forEach((key) => {
        if (key) geocodeCache.set(key, { coords, isPrecision: true });
      });

      return {
        formattedAddress: r.formatted_address,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        coords,
        placeId,
      };
    }
  } catch (e) {
    if (!isActive()) return null;
    console.warn('fetchPlaceDetails error:', e);
  }
  return null;
};

export const searchAddressSuggestions = async (
  query: string,
  city?: string,
  state: string = 'PR'
): Promise<any[]> => {
  let active = true;
  try {
    return await withTimeout<any[]>(
      searchAddressSuggestionsRequest(query, city, state, () => active),
      15_000, [], 'maps:autocomplete'
    );
  } finally {
    active = false;
  }
};

export const fetchPlaceDetails = async (placeId: string): Promise<any | null> => {
  let active = true;
  try {
    return await withTimeout<any | null>(
      fetchPlaceDetailsRequest(placeId, () => active),
      15_000, null, 'maps:place-details'
    );
  } finally {
    active = false;
  }
};
