import CustomerData from "../types/customerData.type"
import { AddressViaCep } from "../types/fullAddress.type";
import { stringifyFullAddress, stringifyMapAddress } from "./formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';

// ─── Neighborhood/City Coordinates mapping ───────────────────────────────────

export const getNeighborhoodCoords = (neighborhood?: string, city?: string) => {
    const neighborhoodCoords: Record<string, { lat: number, lng: number }> = {
        "guaraituba": { lat: -25.3520, lng: -49.1692 },
        "parque dos lagos": { lat: -25.3622, lng: -49.1387 },
        "colombo": { lat: -25.2917, lng: -49.2242 },
        "curitiba": { lat: -25.4290, lng: -49.2671 },
        "centro": { lat: -25.4320, lng: -49.2710 },
        "pinhais": { lat: -25.4411, lng: -49.1931 },
        "piraquara": { lat: -25.4417, lng: -49.0633 },
        "sao jose dos pinhais": { lat: -25.5348, lng: -49.2064 },
        "são josé dos pinhais": { lat: -25.5348, lng: -49.2064 }
    };

    const n = neighborhood?.toLowerCase() || "";
    const c = city?.toLowerCase() || "";

    if (neighborhoodCoords[n]) return neighborhoodCoords[n];
    if (neighborhoodCoords[c]) return neighborhoodCoords[c];
    return null;
};

// ─── Google Maps URL (for "Ver Rota" link) ───────────────────────────────────

export const getShippingRouteUrl = (fullAddress: CustomerData['fullAddress']) => {
    const settings = getSettings();
    const originString = settings.companyAddress;
    const destinationString = stringifyMapAddress(fullAddress);

    const originURI = encodeURIComponent(originString);
    const destinationURI = encodeURIComponent(destinationString);

    return (
        `https://www.google.com/maps/dir/?api=1&origin=${originURI}&destination=${destinationURI}&travelmode=driving`
    )
}

// ─── CEP Lookup ──────────────────────────────────────────────────────────────

export const getAddressByCep = async (cep: string): Promise<AddressViaCep> => {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);

    const data = await res.json();
    return data
}

// ─── Route Result Type ───────────────────────────────────────────────────────

export interface RouteResult {
    distanceKm: number;
    durationMinutes: number;
    destinationCoords: [number, number]; // [lng, lat] (MapLibre/GeoJSON format)
    routeGeoJSON: any; // GeoJSON geometry from Google Maps Directions
}

// ─── Google Maps Service Loader ──────────────────────────────────────────────
const loadGoogleMapsApi = async (apiKey: string): Promise<void> => {
    if ((window as any).__googleMapsPromise) return (window as any).__googleMapsPromise;
    if ((window as any).google?.maps) return Promise.resolve();
    
    (window as any).__googleMapsPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
    });
    return (window as any).__googleMapsPromise;
};

// ─── Geocode address ─────────────────────────────────────────────

export interface GeocodeResponse {
    coords: [number, number];
    isPrecision: boolean;
}

export const geocodeAddress = async (address: CustomerData['fullAddress'] | string): Promise<GeocodeResponse | null> => {
    let street = '', neighborhood = '', city = '', number = '', state = 'PR';
    
    if (typeof address === 'string') {
        street = address;
    } else if (address) {
        street = address.street || '';
        neighborhood = address.neighborhood || '';
        city = address.city || '';
        number = address.number || '';
        state = address.state || 'PR';
    }

    const settings = getSettings();
    if (!settings.googleMapsApiKey) {
        console.warn("[geocodeAddress] Google Maps API Key não configurada.");
        return null;
    }

    // Monta query primária completa
    const queryPrimary = [
        street ? `${street}${number ? ', ' + number : ''}` : '',
        neighborhood,
        city || 'Colombo',
        state || 'PR',
        'Brasil'
    ].filter(Boolean).join(', ');

    // Query de fallback caso número ou rua específica falhe
    const queryFallback = [
        street || neighborhood,
        city || 'Colombo',
        state || 'PR',
        'Brasil'
    ].filter(Boolean).join(', ');

    // Verificar limites operacionais (Usage Guard)
    const guard = await ApiUsageGuard.check('google_geocoding');
    if (!guard.allowed) {
        console.warn(`[ApiUsageGuard] Chamada a Geocoding bloqueada: ${guard.reason}`);
        return null;
    }

    const startTime = Date.now();
    try {
        await loadGoogleMapsApi(settings.googleMapsApiKey);
        const geocoder = new (window as any).google.maps.Geocoder();

        const runGeocode = async (q: string): Promise<any> => {
            return new Promise((resolve, reject) => {
                geocoder.geocode({ address: q, region: 'br', componentRestrictions: { country: 'br' } }, (results: any, status: any) => {
                    if (status === 'OK' && results && results.length > 0) resolve(results[0]);
                    else reject(status);
                });
            });
        };

        let r: any = null;
        try {
            r = await runGeocode(queryPrimary);
        } catch (errPrimary) {
            if (queryFallback !== queryPrimary) {
                console.warn("[geocodeAddress] Falha na query primária, tentando fallback:", queryFallback, errPrimary);
                try {
                    r = await runGeocode(queryFallback);
                } catch (errFb) {
                    console.warn("[geocodeAddress] Falha no fallback de geocode:", errFb);
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
            return {
                coords: [r.geometry.location.lng(), r.geometry.location.lat()] as [number, number],
                isPrecision: true
            };
        }
    } catch (e) {
        console.error("Google Maps Geocoder error:", e);
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
    }

    // Fallback secundário por coordenadas de bairro/cidade conhecidas se geocoder não retornar
    const fallbackCoords = getNeighborhoodCoords(neighborhood, city);
    if (fallbackCoords) {
        console.info("[geocodeAddress] Utilizando coordenadas de aproximação por bairro/cidade:", fallbackCoords);
        return {
            coords: [fallbackCoords.lng, fallbackCoords.lat] as [number, number],
            isPrecision: false
        };
    }

    return null;
};

// ─── Calculate Route via Google Maps (Exclusivo) ──────────────────────────────

export const calculateRouteViaGoogleMaps = async (
    origin: [number, number],
    destination: [number, number],
    apiKey?: string
): Promise<{ distanceKm: number; durationMinutes: number; geometry: any } | null> => {
    const key = apiKey || getSettings().googleMapsApiKey;
    if (!key) {
        console.warn("Google Maps API Key não configurada para cálculo de rota.");
        return null;
    }
    const guard = await ApiUsageGuard.check('google_routes');
    if (!guard.allowed) {
        console.warn(`[ApiUsageGuard] Cálculo de rota bloqueado: ${guard.reason}`);
        return null;
    }

    const startTime = Date.now();
    try {
        await loadGoogleMapsApi(key);
        const directionsService = new (window as any).google.maps.DirectionsService();
        const request = {
            origin: { lat: origin[1], lng: origin[0] },
            destination: { lat: destination[1], lng: destination[0] },
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
            region: 'br',
            language: 'pt-BR'
        };
        const r: any = await new Promise((resolve, reject) => {
            directionsService.route(request, (result: any, status: any) => {
                if (status === 'OK') resolve(result);
                else reject(status);
            });
        });

        if (r.routes && r.routes.length > 0) {
            const route = r.routes[0];
            const leg = route.legs[0];
            const distanceKm = Number((leg.distance.value / 1000).toFixed(1));
            const durationMinutes = Math.ceil(leg.duration.value / 60);
            
            ApiUsageTracker.record({
                provider: 'google',
                service: 'google_routes',
                operation: 'directions_route',
                units: 1,
                status: 'SUCCESS',
                response_time_ms: Date.now() - startTime,
                module_source: 'logistics',
            });

            return {
                distanceKm,
                durationMinutes,
                geometry: {
                    type: "LineString",
                    coordinates: route.overview_path.map((p: any) => [p.lng(), p.lat()])
                }
            };
        }
    } catch (e) {
        console.error("Google Directions API error:", e);
        ApiUsageTracker.record({
            provider: 'google',
            service: 'google_routes',
            operation: 'directions_route',
            units: 1,
            status: 'ERROR',
            response_time_ms: Date.now() - startTime,
            module_source: 'logistics',
            error_message: String(e),
        });
    }
    return null;
};

// ─── Public: Auto-calculate route distance (Exclusivo Google Maps) ───────────

export const autoCalculateRouteDistance = async (address: CustomerData['fullAddress'] | any): Promise<RouteResult | null> => {
    try {
        const settings = getSettings();
        if (!settings.googleMapsApiKey) {
            console.warn("[autoCalculateRouteDistance] Google Maps API Key não configurada nas configurações do sistema.");
            return null;
        }

        const origin: [number, number] = settings.storeOriginCoords || [-49.16928181659719, -25.352030536045138];

        console.info("[autoCalculateRouteDistance] Iniciando geocodificação do endereço de destino:", address);
        const geoRes = await geocodeAddress(address);
        if (!geoRes) {
            console.warn("[autoCalculateRouteDistance] Geocodificação retornou nulo para o endereço:", address);
            return null;
        }
        
        const destCoords = geoRes.coords;
        console.info("[autoCalculateRouteDistance] Coordenadas obtidas:", destCoords, "Calculando rota de:", origin);
        const routeData = await calculateRouteViaGoogleMaps(origin, destCoords, settings.googleMapsApiKey);
        if (!routeData) {
            console.warn("[autoCalculateRouteDistance] DirectionsService não encontrou rota viável para as coordenadas:", destCoords);
            return null;
        }

        console.info(`[autoCalculateRouteDistance] Sucesso! Distância: ${routeData.distanceKm} km, Duração: ${routeData.durationMinutes} min`);
        return {
            distanceKm: routeData.distanceKm,
            durationMinutes: routeData.durationMinutes,
            destinationCoords: destCoords,
            routeGeoJSON: routeData.geometry
        };
    } catch (error) {
        console.error("Erro ao calcular distância via Google Maps:", error);
        return null;
    }
};

// ─── Search Address Suggestions via Google Places / Geocoder (Exclusivo) ─────

export const searchAddressSuggestions = async (query: string, city?: string, state: string = 'PR'): Promise<any[]> => {
    if (!query || query.trim().length < 2) return [];
    
    const settings = getSettings();
    if (!settings.googleMapsApiKey) {
        return [];
    }

    const stateTarget = (state || 'PR').trim().toUpperCase();
    const cleanQuery = query
        .replace(/^(rua|travessa|avenida|trav|r\.|av\.|aven|rod\.|rodovia|prefeito|pref\.|gov\.|governador|pres\.|presidente)\s+/i, '')
        .replace(/\s(da|do|de|das|dos|d')\s/gi, ' ')
        .trim();

    const cacheQueryKey = `v2_${stateTarget.toLowerCase()}_${cleanQuery.toLowerCase()}`;

    try {
        const { data, error } = await supabase
            .from('address_cache')
            .select('results')
            .eq('query_key', cacheQueryKey)
            .single();
        if (!error && data && data.results && data.results.length > 0) {
            // Registrar chamada economizada pelo cache
            ApiUsageTracker.record({
                provider: 'google',
                service: 'google_places',
                operation: 'autocomplete_cache_hit',
                units: 1,
                status: 'SUCCESS',
                cache_hit: true,
                module_source: 'registrations'
            });
            return data.results;
        }
    } catch {}

    // Verificar guard antes de acionar chamada externa ao Google Places
    const guard = await ApiUsageGuard.check('google_places');
    if (!guard.allowed) {
        console.warn(`[ApiUsageGuard] Busca de sugestões bloqueada: ${guard.reason}`);
        return [];
    }

    const stateLabel = stateTarget === 'PR' ? 'Paraná' : stateTarget;
    const searchSuffix = `${city ? city + ', ' : ''}${stateLabel}, Brasil`;
    const fullQuery = query.toUpperCase().includes(stateTarget) ? query : `${query}, ${searchSuffix}`;

    const startTime = Date.now();
    try {
        await loadGoogleMapsApi(settings.googleMapsApiKey);
        const google = (window as any).google;

        // 1. Tenta AutocompleteService do Google Places (com restrição ao país e direcionamento ao estado)
        if (google?.maps?.places?.AutocompleteService) {
            try {
                const autocompleteService = new google.maps.places.AutocompleteService();
                const searchInput = `${query}${city ? ', ' + city : ''}, ${stateLabel}, Brasil`;
                const predictions: any[] = await new Promise((resolve) => {
                    autocompleteService.getPlacePredictions(
                        {
                            input: searchInput,
                            componentRestrictions: { country: 'br' },
                        },
                        (res: any, status: any) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && res) {
                                resolve(res);
                            } else {
                                resolve([]);
                            }
                        }
                    );
                });

                if (predictions && predictions.length > 0) {
                    // Filtrar predições para garantir que pertencem ao estado selecionado (evitando dados de outros estados)
                    const isStateMatch = (desc: string) => {
                        const d = desc.toUpperCase();
                        if (stateTarget === 'PR') {
                            return d.includes('PR') || d.includes('PARANÁ') || d.includes('PARANA');
                        }
                        return d.includes(stateTarget);
                    };

                    const filteredPredictions = predictions.filter((p: any) => isStateMatch(p.description));
                    const selectedPredictions = filteredPredictions.length > 0 ? filteredPredictions : predictions;

                    const placesMapped = selectedPredictions.map((pred: any) => {
                        const mainText = pred.structured_formatting?.main_text || pred.description.split(',')[0];
                        const secondaryParts = (pred.structured_formatting?.secondary_text || '').split(',').map((s: string) => s.trim());
                        
                        const suburb = secondaryParts[0] || '';
                        const cityFound = secondaryParts[1] || city || 'Colombo';
                        const stateFound = secondaryParts[2] || stateTarget;

                        return {
                            display_name: pred.description,
                            place_id: pred.place_id,
                            lat: 0,
                            lon: 0,
                            address: {
                                road: mainText,
                                suburb: suburb,
                                neighbourhood: suburb,
                                city: cityFound,
                                state: stateFound,
                                postcode: ''
                            }
                        };
                    });

                    supabase.from('address_cache').upsert({
                        query_key: cacheQueryKey,
                        results: placesMapped
                    }).then().catch(() => {});

                    ApiUsageTracker.record({
                        provider: 'google',
                        service: 'google_places',
                        operation: 'places_autocomplete',
                        units: 1,
                        status: 'SUCCESS',
                        cache_hit: false,
                        response_time_ms: Date.now() - startTime,
                        module_source: 'registrations'
                    });

                    return placesMapped;
                }
            } catch (autoErr) {
                console.warn("Places AutocompleteService warning:", autoErr);
            }
        }

        // 2. Google Geocoder (com restrição ao estado)
        const geocoder = new google.maps.Geocoder();
        const gResults: any[] = await new Promise((resolve, reject) => {
            geocoder.geocode({
                address: fullQuery,
                region: 'br',
                componentRestrictions: { country: 'br', administrativeArea: stateTarget }
            }, (res: any, status: any) => {
                if (status === 'OK' && res) resolve(res);
                else reject(status);
            });
        });

        if (gResults && gResults.length > 0) {
            const mappedResults = gResults.map((r: any) => {
                const getComponent = (type: string) => {
                    const comp = r.address_components?.find((c: any) => c.types.includes(type));
                    return comp ? comp.long_name : "";
                };
                
                return {
                    display_name: r.formatted_address,
                    lat: r.geometry.location.lat(),
                    lon: r.geometry.location.lng(),
                    address: {
                        road: getComponent("route") || r.formatted_address.split(',')[0],
                        suburb: getComponent("sublocality") || getComponent("sublocality_level_1") || getComponent("neighborhood"),
                        neighbourhood: getComponent("neighborhood") || getComponent("sublocality") || getComponent("sublocality_level_1"),
                        city: getComponent("administrative_area_level_2") || getComponent("locality") || city || 'Colombo',
                        state: getComponent("administrative_area_level_1") || stateTarget,
                        postcode: getComponent("postal_code")
                    }
                };
            });
            
            supabase.from('address_cache').upsert({
                query_key: cacheQueryKey,
                results: mappedResults
            }).then().catch(() => {});

            ApiUsageTracker.record({
                provider: 'google',
                service: 'google_geocoding',
                operation: 'geocode_search',
                units: 1,
                status: 'SUCCESS',
                cache_hit: false,
                response_time_ms: Date.now() - startTime,
                module_source: 'registrations'
            });

            return mappedResults;
        }
    } catch (error) {
        console.error("Erro na API do Google Maps:", error);
        ApiUsageTracker.record({
            provider: 'google',
            service: 'google_places',
            operation: 'search_address',
            units: 1,
            status: 'ERROR',
            cache_hit: false,
            response_time_ms: Date.now() - startTime,
            module_source: 'registrations',
            error_message: String(error)
        });
    }

    return [];
};

// ─── Fetch Detailed Place Information by PlaceId ─────────────────────────────

export const fetchPlaceDetails = async (placeId: string): Promise<any | null> => {
    const settings = getSettings();
    if (!settings.googleMapsApiKey || !placeId) return null;

    const guard = await ApiUsageGuard.check('google_places');
    if (!guard.allowed) {
        console.warn(`[ApiUsageGuard] Detalhes de lugar bloqueados: ${guard.reason}`);
        return null;
    }

    const startTime = Date.now();
    try {
        await loadGoogleMapsApi(settings.googleMapsApiKey);
        const google = (window as any).google;
        const geocoder = new google.maps.Geocoder();

        const r: any = await new Promise((resolve, reject) => {
            geocoder.geocode({ placeId }, (results: any, status: any) => {
                if (status === 'OK' && results && results.length > 0) resolve(results[0]);
                else reject(status);
            });
        });

        if (r) {
            ApiUsageTracker.record({
                provider: 'google',
                service: 'google_places',
                operation: 'place_details',
                units: 1,
                status: 'SUCCESS',
                response_time_ms: Date.now() - startTime,
                module_source: 'registrations'
            });
            const getComponent = (type: string) => {
                const comp = r.address_components?.find((c: any) => c.types.includes(type));
                return comp ? comp.long_name : "";
            };

            return {
                formattedAddress: r.formatted_address,
                street: getComponent("route") || r.formatted_address.split(',')[0],
                number: getComponent("street_number") || "",
                neighborhood: getComponent("sublocality") || getComponent("sublocality_level_1") || getComponent("neighborhood") || "",
                city: getComponent("administrative_area_level_2") || getComponent("locality") || "",
                state: getComponent("administrative_area_level_1") || "PR",
                cep: (getComponent("postal_code") || "").replace(/\D/g, ""),
                coords: [r.geometry.location.lng(), r.geometry.location.lat()] as [number, number]
            };
        }
    } catch (e) {
        console.warn("fetchPlaceDetails error:", e);
    }
    return null;
};
