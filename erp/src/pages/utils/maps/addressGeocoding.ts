import CustomerData from '../../types/customerData.type';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { parseCoordinatesFromMapsUrl } from '../mapCoordinates';
import { isGoogleQuotaError, loadGoogleMapsApi } from './googleMapsLoader';

export interface GeocodeResponse {
  coords: [number, number];
  isPrecision: boolean;
}

const STORAGE_KEY = 'morante_geocode_cache_v2';

const loadPersistedGeocodeCache = (): Map<string, GeocodeResponse> => {
  const map = new Map<string, GeocodeResponse>();
  if (typeof window === 'undefined' || !window.localStorage) return map;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(([k, v]) => {
          if (k && v && Array.isArray(v.coords)) map.set(k, v);
        });
      }
    }
  } catch (e) {
    console.warn('[addressGeocoding] Falha ao carregar cache do localStorage:', e);
  }
  return map;
};

export const geocodeCache = loadPersistedGeocodeCache();

let persistTimer: any = null;
export const schedulePersistGeocodeCache = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const entries = Array.from(geocodeCache.entries()).slice(-500);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('[addressGeocoding] Falha ao persistir cache no localStorage:', e);
    }
  }, 1000);
};

export const geocodeRequests = new Map<
  string,
  { promise: Promise<GeocodeResponse | null>; failureReason: string }
>();

export const getGeocodeRequestKey = (address: any): string => {
  if (typeof address === 'string') {
    return address.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }
  if (!address) return '';

  const mapsUrl = address.mapsUrl || address.googleMapsUrl || address.mapsLink || '';
  if (
    ![mapsUrl, address.street, address.number, address.neighborhood, address.city, address.cep].some(
      (value) => String(value || '').trim()
    )
  ) {
    return '';
  }

  return [
    String(mapsUrl).trim(),
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state || 'PR',
    address.cep,
  ]
    .map((value, index) =>
      index === 0
        ? String(value || '').trim()
        : String(value || '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLocaleLowerCase()
    )
    .join('|');
};

export const seedGeocodeCache = (query: string, result: GeocodeResponse): void => {
  if (query && result) {
    geocodeCache.set(query.trim(), result);
    schedulePersistGeocodeCache();
  }
};

/**
 * Remove duplicação de número no final da rua caso já esteja presente no campo número.
 * Ex: street: "Rua XV de Novembro, 100", number: "100" -> cleanStreet: "Rua XV de Novembro"
 */
export const normalizeStreetAndNumber = (
  rawStreet: string,
  rawNumber: string
): { cleanStreet: string; cleanNumber: string } => {
  let cleanStreet = String(rawStreet || '').trim();
  const cleanNumber = String(rawNumber || '').trim();

  if (cleanNumber) {
    const escapedNumber = cleanNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanStreet = cleanStreet
      .replace(new RegExp(`[,\\s]+${escapedNumber}\\s*$`, 'i'), '')
      .trim();
  }

  return { cleanStreet, cleanNumber };
};

/**
 * Monta lista ordenada de queries candidatas para o Geocoder do Google,
 * garantindo fallbacks inteligentes caso o bairro retornado pelo Places seja conflitante.
 */
export const buildGeocodeCandidateQueries = (params: {
  cleanStreet: string;
  cleanNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}): string[] => {
  const { cleanStreet, cleanNumber, neighborhood, city, state, cep } = params;
  const targetCity = city || 'Colombo';
  const targetState = state || 'PR';
  const streetWithNumber = cleanStreet
    ? `${cleanStreet}${cleanNumber ? ', ' + cleanNumber : ''}`
    : '';

  const queries: string[] = [];

  // 1. Query primária completa (Rua + Número, Bairro, CEP, Cidade, UF, Brasil)
  queries.push(
    [streetWithNumber, neighborhood, cep ? `CEP ${cep}` : '', targetCity, targetState, 'Brasil']
      .filter(Boolean)
      .join(', ')
  );

  // 2. Se houver CEP e Bairro: tenta Rua + Número + CEP + Cidade + UF (SEM bairro conflitante)
  if (cep && neighborhood && streetWithNumber) {
    queries.push(
      [streetWithNumber, `CEP ${cep}`, targetCity, targetState, 'Brasil']
        .filter(Boolean)
        .join(', ')
    );
  }

  // 3. Fallback crucial: Rua + Número + Cidade + UF (SEM bairro).
  // Elimina divergências comuns onde o Places retorna sub-bairro/vila não reconhecido pelo Geocoder.
  if (neighborhood && streetWithNumber) {
    queries.push(
      [streetWithNumber, targetCity, targetState, 'Brasil']
        .filter(Boolean)
        .join(', ')
    );
  }

  // 4. Rua + Bairro + Cidade + UF (sem número)
  if (cleanNumber && neighborhood && cleanStreet) {
    queries.push(
      [cleanStreet, neighborhood, targetCity, targetState, 'Brasil']
        .filter(Boolean)
        .join(', ')
    );
  }

  // 5. Rua + Cidade + UF (fallback clássico de via)
  if (cleanStreet) {
    queries.push(
      [cleanStreet, targetCity, targetState, 'Brasil']
        .filter(Boolean)
        .join(', ')
    );
  }

  // 6. CEP + Cidade + UF (quando rua for muito nova ou não localizada)
  if (cep) {
    queries.push(
      [cep ? `CEP ${cep}` : '', targetCity, targetState, 'Brasil']
        .filter(Boolean)
        .join(', ')
    );
  }

  // Retorna lista com elementos únicos não vazios
  return Array.from(new Set(queries.filter((q) => q.trim().length > 0)));
};

export const geocodeAddressUncached = async (
  address: CustomerData['fullAddress'] | string | any,
  onFailure?: (reason: string) => void
): Promise<GeocodeResponse | null> => {
  let street = '',
    neighborhood = '',
    city = '',
    number = '',
    state = 'PR',
    cep = '',
    placeId = '';

  if (typeof address === 'string') {
    street = address;
  } else if (address) {
    // 0. Coordenadas diretas no objeto (preservadas do autocomplete ou GPS)
    if (
      Array.isArray(address.coords) &&
      address.coords.length === 2 &&
      Number.isFinite(address.coords[0]) &&
      Number.isFinite(address.coords[1]) &&
      (address.coords[0] !== 0 || address.coords[1] !== 0)
    ) {
      return {
        coords: [Number(address.coords[0]), Number(address.coords[1])],
        isPrecision: true,
      };
    }

    // PRIORIDADE ABSOLUTA: Se a localização contiver URL (mapsUrl), tenta extrair coordenadas diretas primeiro!
    const mapsUrl = address.mapsUrl || address.googleMapsUrl || address.mapsLink;
    if (mapsUrl) {
      const parsed = parseCoordinatesFromMapsUrl(mapsUrl);
      if (parsed) {
        console.info(
          '[geocodeAddress] Coordenadas extraídas com precisão direta da URL do Google Maps:',
          parsed
        );
        return {
          coords: [parsed.longitude, parsed.latitude] as [number, number],
          isPrecision: true,
        };
      }
      if (!address.street && !address.neighborhood && !address.city && !address.cep) {
        onFailure?.(
          'A URL de localização não contém coordenadas reconhecíveis. Confira o link do Google Maps ou informe o endereço físico.'
        );
        return null;
      }
    }

    street = address.street || '';
    neighborhood = address.neighborhood || '';
    city = address.city || '';
    number = address.number || '';
    state = address.state || 'PR';
    cep = address.cep || '';
    placeId = address.placeId || '';
  }

  // Não consumir cota com uma tentativa de geocodificação sem endereço real.
  const hasAddressData = [street, neighborhood, city, cep, placeId].some(
    (value) => String(value || '').trim().length > 0
  );
  if (!hasAddressData) {
    onFailure?.(
      'Endereço insuficiente para geocodificação. Informe ao menos rua, bairro ou cidade.'
    );
    return null;
  }

  const { cleanStreet, cleanNumber } = normalizeStreetAndNumber(street, number);
  const candidateQueries = buildGeocodeCandidateQueries({
    cleanStreet,
    cleanNumber,
    neighborhood,
    city,
    state,
    cep,
  });

  // Verificar se alguma das queries já está em cache
  for (const query of candidateQueries) {
    const cached = geocodeCache.get(query);
    if (cached) return cached;
  }

  // Verificar limites operacionais (Usage Guard)
  const guard = await ApiUsageGuard.check('google_geocoding');
  if (!guard.allowed) {
    console.warn(`[ApiUsageGuard] Chamada a Geocoding bloqueada: ${guard.reason}`);
    onFailure?.(`A busca do endereço foi bloqueada: ${guard.reason}`);
    return null;
  }

  const startTime = Date.now();
  let lastGeocodeStatus = '';
  try {
    await loadGoogleMapsApi();
    const google = (window as any).google;
    const geocoder = new google.maps.Geocoder();

    const runGeocode = async (requestParam: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        geocoder.geocode(
          typeof requestParam === 'string'
            ? { address: requestParam, region: 'br', componentRestrictions: { country: 'br' } }
            : requestParam,
          (results: any, status: any) => {
            if (status === 'OK' && results && results.length > 0) resolve(results[0]);
            else reject(status);
          }
        );
      });
    };

    let r: any = null;
    let isPrimarySuccess = false;

    // Se temos o placeId do Google Places, resolver diretamente por ele é 100% infalível
    if (placeId) {
      try {
        r = await runGeocode({ placeId });
        isPrimarySuccess = true;
      } catch (placeErr) {
        lastGeocodeStatus = String(placeErr);
      }
    }

    // Se não resolveu por placeId, percorre a lista inteligente de queries
    if (!r) {
      for (let i = 0; i < candidateQueries.length; i++) {
        const query = candidateQueries[i];
        try {
          r = await runGeocode(query);
          isPrimarySuccess = i === 0;
          break;
        } catch (err) {
          lastGeocodeStatus = String(err);
          // Erros de cota ou autorização não serão corrigidos tentando outras queries
          if (isGoogleQuotaError(err)) {
            break;
          }
        }
      }
    }

    if (r?.geometry?.location) {
      ApiUsageTracker.record({
        provider: 'google',
        service: 'google_geocoding',
        operation: 'geocode',
        units: 1,
        status: 'SUCCESS',
        response_time_ms: Date.now() - startTime,
        module_source: 'sales_order',
      });
      const result: GeocodeResponse = {
        coords: [
          typeof r.geometry.location.lng === 'function'
            ? r.geometry.location.lng()
            : r.geometry.location.lng,
          typeof r.geometry.location.lat === 'function'
            ? r.geometry.location.lat()
            : r.geometry.location.lat,
        ],
        isPrecision: isPrimarySuccess,
      };

      // Alimenta o cache com a query primária e com a query de sucesso
      candidateQueries.forEach((q) => geocodeCache.set(q, result));
      if (r.formatted_address) geocodeCache.set(r.formatted_address, result);
      schedulePersistGeocodeCache();

      return result;
    }
  } catch (e) {
    console.error('Google Maps Geocoder error:', e);
    onFailure?.(`Falha no serviço de geocodificação do Google Maps: ${String(e)}`);
    ApiUsageTracker.record({
      provider: 'google',
      service: 'google_geocoding',
      operation: 'geocode',
      units: 1,
      status: 'ERROR',
      response_time_ms: Date.now() - startTime,
      module_source: 'sales_order',
      error_message: String(e),
    });
    return null;
  }

  if (isGoogleQuotaError(lastGeocodeStatus)) {
    onFailure?.(
      'A cota diária do Google Maps foi atingida. O pedido pode ser salvo, mas a localização e o cálculo da rota ficarão pendentes até a cota ser renovada.'
    );
  } else {
    onFailure?.(
      `O Google Maps não localizou o endereço informado${lastGeocodeStatus ? ` (${lastGeocodeStatus})` : ''}. Confira rua, número, bairro, cidade e UF.`
    );
  }
  return null;
};

export const geocodeAddress = async (
  address: CustomerData['fullAddress'] | string | any,
  onFailure?: (reason: string) => void
): Promise<GeocodeResponse | null> => {
  const requestKey = getGeocodeRequestKey(address);
  if (!requestKey) return geocodeAddressUncached(address, onFailure);

  const existingRequest = geocodeRequests.get(requestKey);
  if (existingRequest) {
    const result = await existingRequest.promise;
    if (!result && existingRequest.failureReason) onFailure?.(existingRequest.failureReason);
    return result;
  }

  const request = { promise: Promise.resolve<GeocodeResponse | null>(null), failureReason: '' };
  request.promise = geocodeAddressUncached(address, (reason) => {
    request.failureReason = reason;
    onFailure?.(reason);
  });
  geocodeRequests.set(requestKey, request);

  try {
    return await request.promise;
  } finally {
    if (geocodeRequests.get(requestKey) === request) geocodeRequests.delete(requestKey);
  }
};
